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
import {getJournalDir} from './constants';
import {
  log,
  ensureDirExists,
  formatTimeString,
  getFilename,
  initializeContext,
} from './helpers';
import {SettingsContext} from './SettingsContext';
import type {ModelName} from './types';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import {StyleSheet} from 'react-native';

export default function RecordScreen() {
  const settings = React.useContext(SettingsContext);

  const [docDir, setDocDir] = React.useState('');
  const [loadedModel, setLoadedModel] = React.useState<ModelName | undefined>();
  const [canRecord, setCanRecord] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState<
    Audio.Recording | undefined
  >();
  const [status, setStatus] = React.useState('Initializing...');
  const [elapsed, setElapsed] = React.useState<number | undefined>();
  const [progress, setProgress] = React.useState<number>(100);
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
    if (docDir === '') {
      getJournalDir().then(dir => {
        setDocDir(dir);
      });
    } else if (!loadedModel || loadedModel !== settings.modelName) {
      setStatusAndLog(
        `Downloading and initializing model ${settings.modelName}`,
      );
      setCanRecord(false);
      // TODO: add download progress bar
      initializeContext(
        whisperContext,
        setWhisperContext,
        docDir,
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
  }, [docDir, whisperContext, settings.modelName, loadedModel]);

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
    const {
      // stop,
      promise,
    } = whisperContext.transcribe(docDir + filename, options);
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
      // TODO: clean up this part here
      const dirName = getFilename('');
      const subDir = `${docDir}${dirName}/`;
      const uriOut = subDir + dirName + '.wav';
      const filename = `${dirName}/${dirName}.wav`;
      await ensureDirExists(subDir);
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
          // initiate transcription
          const transcript = await transcribe(filename);
          if (transcript) {
            const {result} = transcript;
            setStatusAndLog('Writing to file...');
            FileSystem.writeAsStringAsync(
              `${subDir}${dirName}.md`,
              result,
            ).then(() => {
              setStatusAndLog(`Done writing to file '${dirName}'!`);
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

  return (
    <SafeAreaView style={styles.recording}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  recording: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  progressBar: {
    width: 200,
  },
});
