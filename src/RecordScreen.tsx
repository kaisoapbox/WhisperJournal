import React from 'react';
import {Button} from 'react-native-paper';
import {Audio} from 'expo-av';
import {FFmpegKit, ReturnCode} from 'ffmpeg-kit-react-native';
import * as FileSystem from 'expo-file-system';
import {initWhisper} from 'whisper.rn';
import {unzip} from 'react-native-zip-archive';
import type {WhisperContext} from 'whisper.rn';
import {getJournalDir, modelHost} from './constants';
import {Platform} from 'react-native';

// Checks if directory exists. If not, creates it
async function ensureDirExists(dir: string) {
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    console.log("Directory doesn't exist, creating...");
    await FileSystem.makeDirectoryAsync(dir, {intermediates: true});
  }
}

export default function RecordScreen() {
  const [docDir, setDocDir] = React.useState<string>('');
  const [isRecording, setIsRecording] = React.useState<
    Audio.Recording | undefined
  >();
  const [whisperContext, setWhisperContext] =
    React.useState<WhisperContext | null>(null);

  React.useEffect(() => {
    getJournalDir().then(setDocDir);
  }, []);

  async function initializeContext() {
    if (whisperContext) {
      console.log('Found previous context');
      await whisperContext.release();
      setWhisperContext(null);
      console.log('Released previous context');
    }
    await ensureDirExists(docDir);
    const modelFilePath = `${docDir}/ggml-tiny.en.bin`;
    if ((await FileSystem.getInfoAsync(modelFilePath)).exists) {
      console.log('Model already exists');
    } else {
      console.log('Start Download Model');
      await FileSystem.downloadAsync(
        `${modelHost}/ggml-tiny.en.bin`,
        modelFilePath,
      );
    }

    // If you don't want to enable Core ML, you can remove this
    const coremlModelFilePath = `${docDir}/ggml-tiny.en-encoder.mlmodelc.zip`;
    if (
      Platform.OS === 'ios' &&
      (await FileSystem.getInfoAsync(coremlModelFilePath)).exists
    ) {
      console.log('Core ML Model already exists');
    } else if (Platform.OS === 'ios') {
      console.log('Start Download Core ML Model');
      await FileSystem.downloadAsync(
        `${modelHost}/ggml-tiny.en-encoder.mlmodelc.zip`,
        coremlModelFilePath,
      );
      console.log('Downloaded Core ML Model model file');
      await unzip(coremlModelFilePath, docDir);
      console.log('Unzipped Core ML Model model successfully.');
    }

    console.log('Initialize context...');
    const startTime = Date.now();
    const ctx = await initWhisper({filePath: modelFilePath});
    const endTime = Date.now();
    console.log('Loaded model, ID:', ctx.id);
    console.log('Loaded model in', endTime - startTime, 'ms');
    setWhisperContext(ctx);
  }

  async function transcribe() {
    if (!whisperContext) {
      return console.log('No context');
    }

    console.log('Start transcribing...');
    const startTime = Date.now();
    const {
      // stop,
      promise,
    } = whisperContext.transcribe(docDir + 'file_2.wav', {
      language: 'en',
      maxLen: 1,
      tokenTimestamps: true,
    });
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
      const uriOut = docDir + 'file_2.wav';
      await ensureDirExists(docDir);
      FFmpegKit.execute(
        `-i ${uri} -ar 16000 -ac 1 -c:a pcm_s16le ${uriOut}`,
      ).then(async session => {
        const returnCode = await session.getReturnCode();

        if (ReturnCode.isSuccess(returnCode)) {
          console.log('Converted file successfully written to', uriOut);
          // SUCCESS
        } else if (ReturnCode.isCancel(returnCode)) {
          // CANCEL
          console.log('cancelled');
        } else {
          // ERROR
          console.log('error');
        }
      });
      // initiate transcription
    }
  }

  return (
    <>
      <Button
        mode="contained"
        onPress={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </Button>
      <Button mode="contained" onPress={initializeContext}>
        Initialize Context
      </Button>
      <Button mode="contained" onPress={transcribe}>
        Transcribe
      </Button>
    </>
  );
}
