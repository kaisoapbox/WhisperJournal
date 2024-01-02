import React from 'react';
import {
  ActivityIndicator,
  Divider,
  IconButton,
  ProgressBar,
  Surface,
  Text,
} from 'react-native-paper';
import {JournalEntry, RootParamList} from './types';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system';
import {Audio} from 'expo-av';
import type {AVPlaybackStatus} from 'expo-av';
import {getDummyAsset, formatTimeString, log} from './helpers';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ScrollView, StyleSheet, View} from 'react-native';

type Props = NativeStackScreenProps<RootParamList, 'JournalEntry'>;

export default function JournalEntryScreen({route}: Props) {
  const insets = useSafeAreaInsets();
  const {name, entry} = route.params;
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
        log(
          `Encountered a fatal error during playback: ${playbackStatus.error}`,
          console.error,
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
    async function updateEntry(_entry: JournalEntry) {
      if (_entry.audio) {
        const {sound} = await Audio.Sound.createAsync(
          getDummyAsset(_entry.audio),
        );
        setRecording(sound);
        sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      }
      if (_entry.transcript) {
        setTranscript(await FileSystem.readAsStringAsync(_entry.transcript));
      }
    }
    updateEntry(entry);
  }, [entry]);

  const styles = StyleSheet.create({
    player: {alignItems: 'center', justifyContent: 'center'},
    surface: {
      padding: 8,
      margin: 8,
      borderRadius: 8,
    },
    surfaceTranscript: {
      padding: 8,
      margin: 8,
      borderRadius: 8,
      flex: 1,
    },
    headers: {alignSelf: 'center', fontWeight: 'bold'},
    view: {
      marginTop: 8,
      flex: 1,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    },
    text: {flex: 1, marginRight: 8},
  });

  return (
    <View style={styles.view}>
      <Text variant={'headlineSmall'} style={styles.headers}>
        {name}
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
        <Surface style={styles.surfaceTranscript}>
          <ScrollView>
            <Text variant="bodyLarge" style={styles.headers}>
              Transcript
            </Text>
            <Text selectable={true} style={styles.text}>
              {transcript}
            </Text>
          </ScrollView>
        </Surface>
      )}
    </View>
  );
}
