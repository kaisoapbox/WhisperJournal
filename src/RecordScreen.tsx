import React from 'react';
import {
  ActivityIndicator,
  IconButton,
  Text,
  ProgressBar,
} from 'react-native-paper';
import {Audio} from 'expo-av';
import {FFmpegKit, ReturnCode} from 'ffmpeg-kit-react-native';
import type {TranscribeFileOptions, WhisperContext} from 'whisper.rn';
import {
  log,
  ensureDirExists,
  formatTimeString,
  getFilename,
  initializeContext,
} from './helpers';
import {SettingsContext} from './SettingsContext';
import type {ModelName} from './types';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import {StyleSheet, View} from 'react-native';
import {docDir, docDirName} from './constants';

export default function RecordScreen() {
  const insets = useSafeAreaInsets();
  const settings = React.useContext(SettingsContext);
  const journalDir = settings.journalDir;
  const [loadedModel, setLoadedModel] = React.useState<ModelName | undefined>();
  const [canRecord, setCanRecord] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState<
    Audio.Recording | undefined
  >();
  const [status, setStatus] = React.useState('Initializing...');
  const [elapsed, setElapsed] = React.useState<number | undefined>();
  const [progress, setProgress] = React.useState<number>(-1);
  const [intervalFn, setIntervalFn] = React.useState<
    NodeJS.Timeout | undefined
  >();
  const [whisperContext, setWhisperContext] = React.useState<
    WhisperContext | undefined
  >();

  function setStatusAndLog(
    message: string,
    fn: (message: any) => void = console.log,
  ) {
    log(message, fn);
    setStatus(message);
  }

  React.useEffect(() => {
    log('called useEffect hook');
    if (!loadedModel || loadedModel !== settings.modelName) {
      setStatusAndLog(
        `Downloading and initializing model ${settings.modelName}`,
      );
      setCanRecord(false);
      initializeContext(
        whisperContext,
        setWhisperContext,
        docDirName,
        settings.modelName,
        data => {
          if (data.totalBytesExpectedToWrite !== -1) {
            setProgress(
              data.totalBytesWritten / data.totalBytesExpectedToWrite,
            );
          }
        },
      ).then(() => {
        setLoadedModel(settings.modelName);
        setCanRecord(true);
        setStatusAndLog('Ready to record!');
      });
    }
  }, [whisperContext, settings.modelName, loadedModel]);

  async function transcribe(filename: string) {
    if (!whisperContext) {
      return log('No context');
    }

    setStatusAndLog('Transcribing...');
    const startTime = Date.now();
    const options: TranscribeFileOptions = {
      language: settings.modelName.endsWith('.en') ? 'en' : settings.language,
      translate:
        settings.translate &&
        settings.language === 'auto' &&
        !settings.modelName.endsWith('.en'),
      onProgress: _progress => {
        const endTime = Date.now();
        setProgress(_progress / 100);
        const timeLeft = (
          ((endTime - startTime) * (100 - _progress)) /
          _progress /
          1000
        ).toFixed(0);
        setStatusAndLog(`Transcribing...\nestimated time left: ${timeLeft}s`);
      },
      onNewSegments: segment => {
        log(segment.result);
      },
    };
    log(options);
    // TODO: would this work with SAF URIs?
    const {
      // stop,
      promise,
    } = whisperContext.transcribe(docDirName + filename, options);
    promise.then(transcript => {
      const endTime = Date.now();
      log(
        `Transcribed result: ${transcript.result}\n` +
          `Transcribed in ${endTime - startTime}ms`,
      );
      setStatusAndLog(`Finished transcribing in ${endTime - startTime}ms!`);
    });
    promise.catch(error => {
      setStatusAndLog(error);
    });
    return promise;
  }

  async function startRecording() {
    try {
      setStatusAndLog('Requesting permissions...');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      // unload existing recording if it exists
      if (isRecording) {
        setStatusAndLog('Stopping prior recrording...');
        await isRecording.stopAndUnloadAsync();
      }
      setStatusAndLog('Starting recording...');
      const {recording} = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setProgress(-1);
      setElapsed(0);
      const timeNow = Date.now();
      const interval = setInterval(() => {
        setElapsed(Date.now() - timeNow);
      }, 1000);
      setIntervalFn(interval);
      setIsRecording(recording);
      setStatusAndLog('Recording...');
    } catch (err) {
      setStatusAndLog(`Failed to start recording: ${err}`, console.error);
    }
  }

  async function stopRecording() {
    if (isRecording) {
      setStatusAndLog('Stopping recording...');
      clearInterval(intervalFn);
      setElapsed(undefined);
      setIntervalFn(undefined);
      setIsRecording(undefined);
      await isRecording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      const uri = isRecording.getURI();
      log(`Recording stopped and stored at ${uri}`);
      // use ffmpeg to convert output file to 16-bit wav for whisper
      // TODO: can ffmpeg write straight to the SAF URI?
      // we write to the document directory first
      // then if it's an SAF URI, we move it to the journalDir
      const fileName = getFilename('');
      const uriOut = `${docDir.fileDir}${fileName}.wav`;
      const wavFile = `${fileName}.wav`;
      // TODO: ensure that the journalDir.fileDir itself exists
      await ensureDirExists(docDirName);
      setStatusAndLog('Converting file...');
      const noiseReductionString = settings.noiseReduction
        ? '-af "afftdn=nf=-25" '
        : '';
      const ffmpegCommand = `-i ${uri} -ar 16000 -ac 1 ${noiseReductionString}-c:a pcm_s16le ${uriOut}`;
      log(ffmpegCommand);
      FFmpegKit.execute(ffmpegCommand).then(async session => {
        const returnCode = await session.getReturnCode();

        if (ReturnCode.isSuccess(returnCode)) {
          log(`Converted file successfully written to ${uriOut}`);
          // if saf journalDir, create copy
          if (journalDir.saf) {
            // TODO: not sure whether x-wav will work for all platforms
            const wavUri =
              await FileSystem.StorageAccessFramework.createFileAsync(
                journalDir.fileDir,
                fileName,
                'audio/x-wav',
              );
            // read converted file and copy to file system
            const base64wav = await FileSystem.readAsStringAsync(uriOut, {
              encoding: 'base64',
            });
            await FileSystem.StorageAccessFramework.writeAsStringAsync(
              wavUri,
              base64wav,
              {encoding: 'base64'},
            );
          }
          // initiate transcription
          const transcript = await transcribe(wavFile);
          if (transcript) {
            const {result} = transcript;
            setStatusAndLog('Writing to file...');
            let transcriptName = `${docDir.fileDir}${fileName}.md`;
            // create SAF file before writing to it
            if (journalDir.saf) {
              transcriptName =
                await FileSystem.StorageAccessFramework.createFileAsync(
                  journalDir.fileDir,
                  fileName,
                  'text/markdown',
                );
              // delete wav in document directory
              FileSystem.deleteAsync(uriOut, {idempotent: true}).then(() => {
                log(`deleted ${uriOut} successfully`);
              });
            }
            FileSystem.writeAsStringAsync(transcriptName, result).then(() => {
              setStatusAndLog(`Done writing to file '${fileName}'!`);
            });
          }
          // SUCCESS
        } else if (ReturnCode.isCancel(returnCode)) {
          // CANCEL
          log('cancelled');
        } else {
          // ERROR
          log('error');
        }
      });
    }
  }

  const styles = StyleSheet.create({
    view: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    },
    progressBar: {
      width: 200,
    },
  });

  return (
    <View style={styles.view}>
      {canRecord ? (
        <IconButton
          icon={isRecording ? 'stop' : 'record'}
          mode="contained"
          onPress={isRecording ? stopRecording : startRecording}
          size={30}
          iconColor={isRecording ? undefined : 'red'}
        />
      ) : (
        <ActivityIndicator animating={true} size="large" />
      )}
      <Text>{status}</Text>
      <ProgressBar
        progress={progress}
        visible={progress !== -1 && progress !== 1}
        style={styles.progressBar}
      />
      {elapsed !== undefined && <Text>{formatTimeString(elapsed)}</Text>}
    </View>
  );
}
