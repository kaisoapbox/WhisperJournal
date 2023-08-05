import React from 'react';
import {Button, Text} from 'react-native-paper';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {RootParamList} from './types';
import {SafeAreaView} from 'react-native-safe-area-context';

type Props = BottomTabScreenProps<RootParamList, 'Journal'>;

export default function JournalScreen({navigation}: Props) {
  return (
    <SafeAreaView>
      <Text>Journal screen</Text>
      <Button
        mode="contained"
        onPress={() => {
          navigation.navigate('JournalEntry');
        }}>
        hi
      </Button>
    </SafeAreaView>
  );
}
