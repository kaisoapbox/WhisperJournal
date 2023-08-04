import React from 'react';
import {Button} from 'react-native-paper';
import {Audio} from 'expo-av';

export default function RecordScreen() {
  const [isRecording, setIsRecording] = React.useState<
    Audio.Recording | undefined
  >();

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
    }
  }

  return (
    <Button
      mode="contained"
      onPress={isRecording ? stopRecording : startRecording}>
      {isRecording ? 'Stop Recording' : 'Start Recording'}
    </Button>
  );
}
