import React from 'react';
import {Button, Divider, List} from 'react-native-paper';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {RootParamList} from './types';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import {getJournalDir} from './constants';
import {RefreshControl, FlatList, StyleSheet} from 'react-native';
import {ensureDirExists} from './helpers';

type Props = BottomTabScreenProps<RootParamList, 'Journal'>;

export default function JournalScreen({navigation}: Props) {
  const [docDir, setDocDir] = React.useState<string>('');
  const [refreshing, setRefreshing] = React.useState(true);
  const [files, setFiles] = React.useState<string[]>([]);

  const onRefresh = React.useCallback(
    async (dir?: string) => {
      setRefreshing(true);
      await ensureDirExists(dir || docDir);
      FileSystem.readDirectoryAsync(dir || docDir).then(value => {
        console.log(value);
        setFiles(
          value.filter(_value => {
            return (
              !_value.endsWith('.bin') &&
              !_value.endsWith('.json') &&
              !_value.endsWith('.zip') &&
              !_value.endsWith('.mlmodelc')
            );
          }),
        );
        setRefreshing(false);
      });
    },
    [docDir],
  );

  React.useEffect(() => {
    console.log('called useEffect hook');
    if (docDir === '') {
      getJournalDir().then(value => {
        setDocDir(value);
        onRefresh(value);
      });
    }
  }, [docDir, onRefresh]);
  function deleteEverything() {
    console.log('deleting all wavs');
    files.map(filename => {
      FileSystem.deleteAsync(docDir + filename);
    });
  }
  return (
    <SafeAreaView style={styles.flex}>
      <Button onPress={deleteEverything}>Delete everything</Button>
      <List.Section style={styles.flex}>
        <List.Subheader>Journal Entries</List.Subheader>
        <FlatList
          data={files}
          renderItem={({item}) => (
            <List.Item
              title={item}
              onPress={() => {
                navigation.navigate('JournalEntry', {subDir: item});
              }}
            />
          )}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
