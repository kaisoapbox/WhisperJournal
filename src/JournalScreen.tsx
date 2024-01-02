import React from 'react';
import {Divider, IconButton, List} from 'react-native-paper';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {JournalEntry, RootParamList} from './types';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {RefreshControl, FlatList, StyleSheet, View} from 'react-native';
import {deleteAsync} from 'expo-file-system';
import {ensureDirExists, readableUri, log} from './helpers';
import {SettingsContext} from './SettingsContext';

type Props = BottomTabScreenProps<RootParamList, 'Journal'>;

const regex = RegExp('[-a-zA-Z0-9._]+$');

type ItemProps = {item: string};

// TODO: improve journal entry browser - choose sort, toggle edit mode, description/preview
export default function JournalScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const settings = React.useContext(SettingsContext);
  const journalDir = settings.journalDir;
  const [refreshing, setRefreshing] = React.useState(true);
  const [entries, setEntries] = React.useState<{[name: string]: JournalEntry}>(
    {},
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);

    await ensureDirExists(journalDir.fileDir);
    journalDir.readDirectoryAsync(journalDir.fileDir).then(value => {
      console.log(value);
      // filter out model files, settings, etc.
      const _files = value.filter(_value => {
        return (
          !_value.endsWith('.bin') &&
          !_value.endsWith('.json') &&
          !_value.endsWith('.zip') &&
          !_value.endsWith('.mlmodelc')
        );
      });
      const uriNames = _files.map((_file: string) => {
        const uri = journalDir.saf ? _file : journalDir.fileDir + _file;
        const result = regex.exec(readableUri(_file));
        return result ? {name: result[0], uri} : {name: _file, uri};
      });
      log(uriNames);
      // group wav and md files with the same name
      const fileDict: {[name: string]: JournalEntry} = {};
      uriNames.forEach(({name, uri}) => {
        // logic to handle files with . in the filename root
        // const [root, extension] = file.split('.');
        const lastDotIndex = name.lastIndexOf('.');
        const root = lastDotIndex !== -1 ? name.slice(0, lastDotIndex) : name;
        const extension =
          lastDotIndex !== -1 ? name.slice(lastDotIndex + 1) : '';

        if (fileDict[root]) {
          if (extension === 'wav') {
            fileDict[root].audio = uri;
          } else if (extension === 'md') {
            fileDict[root].transcript = uri;
          }
        } else {
          fileDict[root] = {
            audio: extension === 'wav' ? uri : undefined,
            transcript: extension === 'md' ? uri : undefined,
          };
        }
      });
      log(fileDict);
      setEntries(fileDict);
      setRefreshing(false);
    });
  }, [journalDir]);

  React.useEffect(() => {
    log('called useEffect hook');
    onRefresh();
  }, [onRefresh]);

  function deleteEntry(entry: JournalEntry) {
    log(entry);
    let promises: Promise<void>[] = [];
    if (entry.audio) {
      log('audio');
      promises.push(deleteAsync(entry.audio, {idempotent: true}));
    }
    if (entry.transcript) {
      log('transcript');
      promises.push(deleteAsync(entry.transcript, {idempotent: true}));
    }
    return Promise.all(promises);
  }

  function renderItem({item}: ItemProps) {
    const entry = entries[item];
    return (
      <List.Item
        title={readableUri(item)}
        onPress={() => {
          navigation.navigate('JournalEntry', {
            entry: entries[item],
            name: item,
          });
        }}
        // eslint-disable-next-line react/no-unstable-nested-components
        right={props => (
          <IconButton
            {...props}
            icon="delete"
            onPress={() => {
              deleteEntry(entry).finally(onRefresh);
            }}
          />
        )}
      />
    );
  }

  const styles = StyleSheet.create({
    view: {
      flex: 1,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    },
    flex: {
      flex: 1,
    },
  });

  return (
    <View style={styles.view}>
      <List.Section style={styles.flex}>
        <List.Subheader>Journal Entries</List.Subheader>
        <FlatList
          data={Object.keys(entries).sort()}
          renderItem={renderItem}
          keyExtractor={item => item}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ItemSeparatorComponent={Divider}
          ListEmptyComponent={
            <List.Item title="No entries; record something to see it here." />
          }
          scrollEnabled={true}
        />
      </List.Section>
    </View>
  );
}
