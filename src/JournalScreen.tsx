import React from 'react';
import {Divider, List} from 'react-native-paper';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {RootParamList} from './types';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import {getJournalDir} from './constants';
import {RefreshControl, FlatList, StyleSheet, View} from 'react-native';
import {ensureDirExists} from './helpers';

type Props = BottomTabScreenProps<RootParamList, 'Journal'>;

// TODO: improve journal entry browser - choose sort, delete files, description/preview
export default function JournalScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
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
    </View>
  );
}
