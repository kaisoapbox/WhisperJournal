import React from 'react';
import {Button, Text} from 'react-native-paper';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {RootParamList} from './types';

type Props = BottomTabScreenProps<RootParamList, 'Journal'>;

export default function JournalScreen({navigation}: Props) {
  return (
    <>
      <Text>Journal screen</Text>
      <Button
        mode="contained"
        onPress={() => {
          navigation.navigate('JournalEntry');
        }}>
        hi
      </Button>
    </>
  );
}
