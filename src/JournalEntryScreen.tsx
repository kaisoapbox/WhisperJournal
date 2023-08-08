import React from 'react';
import {
  ActivityIndicator,
  Divider,
  IconButton,
  ProgressBar,
  Surface,
  Text,
} from 'react-native-paper';
import {RootParamList} from './types';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {getJournalDir} from './constants';
import * as FileSystem from 'expo-file-system';
import {Audio} from 'expo-av';
import type {AVPlaybackStatus} from 'expo-av';
import {getDummyAsset, formatTimeString} from './helpers';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StyleSheet} from 'react-native';

type Props = NativeStackScreenProps<RootParamList, 'JournalEntry'>;

export default function JournalEntryScreen({route}: Props) {
  const {subDir} = route.params;
  const [recording, setRecording] = React.useState<Audio.Sound | undefined>();
  const [progress, setProgress] = React.useState(0);
  const [duration, setDuration] = React.useState<number | undefined>();
  const [playing, setPlaying] = React.useState(false);
  const [buffering, setBuffering] = React.useState(false);
  const [transcript, setTranscript] = React.useState<string | undefined>();

  function onPlaybackStatusUpdate(playbackStatus: AVPlaybackStatus) {
    if (!playbackStatus.isLoaded) {
      // Update UI for the unloaded state
      if (playbackStatus.error) {
        console.log(
          `Encountered a fatal error during playback: ${playbackStatus.error}`,
        );
        // Send Expo team the error on Slack or the forums so we can help you debug!
      }
    } else {
      // Update UI for the loaded state
      // set progress bar
      setProgress(playbackStatus.positionMillis);

      if (playbackStatus.durationMillis) {
        setDuration(playbackStatus.durationMillis);
      }

      // Update UI for playing/paused, buffering state
      setPlaying(playbackStatus.isPlaying);
      setBuffering(playbackStatus.isBuffering);
    }
  }

  async function pressPlay() {
    let _playback: AVPlaybackStatus | undefined;
    if (recording !== undefined) {
      // flip playback status
      if (playing) {
        _playback = await recording.pauseAsync();
      } else {
        _playback = await recording.playAsync();
        // check if at the end of recording
        if (
          _playback.isLoaded &&
          _playback.durationMillis === _playback.positionMillis
        ) {
          _playback.positionMillis = 0;
          _playback = await recording.replayAsync(_playback);
        }
      }
      console.log(_playback);
      onPlaybackStatusUpdate(_playback);
    }
  }

  React.useEffect(() => {
    getJournalDir().then(journalDir => {
      FileSystem.readDirectoryAsync(journalDir + subDir).then(async files => {
        console.log(files);
        const wavs = files.filter(filename => {
          return filename.endsWith('.wav');
        });
        const transcripts = files.filter(filename => {
          return filename.endsWith('.md');
        });
        if (wavs.length > 0) {
          const {sound} = await Audio.Sound.createAsync(
            getDummyAsset(journalDir + subDir, wavs[0]),
          );
          setRecording(sound);
          sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
        }
        if (transcripts.length > 0) {
          setTranscript(
            await FileSystem.readAsStringAsync(
              `${journalDir}${subDir}/${transcripts[0]}`,
            ),
          );
        }
      });
    });
  }, [subDir]);

  return (
    <SafeAreaView style={styles.top}>
      <Text variant={'headlineSmall'} style={styles.headers}>
        {subDir}
      </Text>
      {recording !== undefined && (
        <Surface style={styles.surface}>
          <ProgressBar
            progress={duration ? progress / duration : 0}
            indeterminate={duration === undefined}
            visible={true}
          />
          <Surface style={styles.player} elevation={0}>
            <IconButton
              icon={playing ? 'pause' : 'play'}
              mode="contained"
              onPress={pressPlay}
            />
            <Text>
              {formatTimeString(progress)}/{formatTimeString(duration)}
            </Text>
            {buffering && <ActivityIndicator animating={true} />}
          </Surface>
        </Surface>
      )}
      <Divider />
      {transcript && (
        <Surface style={styles.surface}>
          <Text variant="bodyLarge" style={styles.headers}>
            Transcript
          </Text>
          <Text selectable={true}>{transcript}</Text>
        </Surface>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  player: {alignItems: 'center', justifyContent: 'center'},
  surface: {
    padding: 8,
    margin: 8,
    borderRadius: 8,
  },
  headers: {alignSelf: 'center', fontWeight: 'bold'},
  top: {marginTop: 8},
});
