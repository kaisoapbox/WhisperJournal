import React from 'react';
import {ActivityIndicator, Button, Text} from 'react-native-paper';
import {Audio} from 'expo-av';
import {FFmpegKit, ReturnCode} from 'ffmpeg-kit-react-native';
import type {TranscribeOptions, WhisperContext} from 'whisper.rn';
import {getJournalDir} from './constants';
import {ensureDirExists, getFilename, initializeContext} from './helpers';
import {SettingsContext} from './SettingsContext';
import type {ModelName} from './types';
import {SafeAreaView} from 'react-native-safe-area-context';

export default function RecordScreen() {
  const settings = React.useContext(SettingsContext);

  const [docDir, setDocDir] = React.useState<string>('');
  const [loadedModel, setLoadedModel] = React.useState<ModelName | undefined>();
  const [canRecord, setCanRecord] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState<
    Audio.Recording | undefined
  >();
  const [whisperContext, setWhisperContext] = React.useState<
    WhisperContext | undefined
  >();

  React.useEffect(() => {
    console.log('called useEffect hook');
    if (docDir === '') {
      getJournalDir().then(dir => {
        setDocDir(dir);
      });
    } else if (!loadedModel || loadedModel !== settings.modelName) {
      setCanRecord(false);
      initializeContext(
        whisperContext,
        setWhisperContext,
        docDir,
        settings.modelName,
      ).then(() => {
        setLoadedModel(settings.modelName);
        setCanRecord(true);
      });
    }
  }, [docDir, whisperContext, settings.modelName, loadedModel]);

  async function transcribe(filename: string) {
    if (!whisperContext) {
      return console.log('No context');
    }

    console.log('Start transcribing...');
    const startTime = Date.now();
    const options: TranscribeOptions = {
      language: settings.modelName.endsWith('.en') ? 'en' : settings.language,
      translate:
        settings.translate &&
        settings.language === 'auto' &&
        !settings.modelName.endsWith('.en'),
    };
    console.log(options);
    const {
      // stop,
      promise,
    } = whisperContext.transcribe(docDir + filename, options);
    const {result} = await promise;
    const endTime = Date.now();
    console.log(
      `Transcribed result: ${result}\n` +
        `Transcribed in ${endTime - startTime}ms`,
    );
    console.log('Finished transcribing');
  }

  async function startRecording() {
    try {
      console.log('Requesting permissions..');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const {recording} = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setIsRecording(recording);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (isRecording) {
      console.log('Stopping recording..');
      setIsRecording(undefined);
      await isRecording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      const uri = isRecording.getURI();
      console.log('Recording stopped and stored at', uri);
      // use ffmpeg to convert output file to 16-bit wav for whisper
      const filename = getFilename('.wav');
      const uriOut = docDir + filename;
      await ensureDirExists(docDir);
      FFmpegKit.execute(
        `-i ${uri} -ar 16000 -ac 1 -c:a pcm_s16le ${uriOut}`,
      ).then(async session => {
        const returnCode = await session.getReturnCode();

        if (ReturnCode.isSuccess(returnCode)) {
          console.log('Converted file successfully written to', uriOut);
          // initiate transcription
          await transcribe(filename);
          // SUCCESS
        } else if (ReturnCode.isCancel(returnCode)) {
          // CANCEL
          console.log('cancelled');
        } else {
          // ERROR
          console.log('error');
        }
      });
    }
  }

  return (
    <SafeAreaView>
      {canRecord ? (
        <Button
          mode="contained"
          onPress={isRecording ? stopRecording : startRecording}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Button>
      ) : (
        <>
          <ActivityIndicator animating={true} size="large" />
          <Text>
            Downloading and initializing model {settings.modelName}, please
            wait...
          </Text>
        </>
      )}
    </SafeAreaView>
  );
}
