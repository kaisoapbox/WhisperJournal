import React from 'react';
import {RadioButton, SegmentedButtons, Divider, List} from 'react-native-paper';
import {SettingsContext} from './SettingsContext';
import {allModelNames} from './types';
import type {ModelName} from './types';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ScrollView, StyleSheet, View} from 'react-native';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const settings = React.useContext(SettingsContext);
  const [toEnglish, setToEnglish] = React.useState(
    settings.translate ? 'yes' : 'no',
  );
  const [noiseReduction, setNoiseReduction] = React.useState(
    settings.noiseReduction ? 'yes' : 'no',
  );

  const styles = StyleSheet.create({
    spacing: {
      padding: 8,
    },
    view: {
      flex: 1,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    },
  });
  return (
    <View style={styles.view}>
      <ScrollView style={styles.spacing}>
        <List.Section>
          <List.Subheader>Input Language</List.Subheader>
          <SegmentedButtons
            value={settings.language}
            onValueChange={settings.setLanguage}
            buttons={[
              {value: 'en', label: 'English', icon: 'alpha-e-circle-outline'},
              {value: 'auto', label: 'Autodetect', icon: 'web'},
            ]}
          />
        </List.Section>
        <Divider />
        <List.Section>
          <List.Subheader>Translate to English?</List.Subheader>
          <SegmentedButtons
            value={toEnglish}
            onValueChange={value => {
              setToEnglish(value);
              settings.setTranslate(value === 'yes');
            }}
            buttons={[
              {value: 'yes', label: 'Translate', icon: 'translate'},
              {value: 'no', label: 'Disabled', icon: 'translate-off'},
            ]}
          />
        </List.Section>
        <Divider />
        <List.Section>
          <List.Subheader>Noise Reduction</List.Subheader>
          <SegmentedButtons
            value={noiseReduction}
            onValueChange={value => {
              setNoiseReduction(value);
              settings.setNoiseReduction(value === 'yes');
            }}
            buttons={[
              {value: 'yes', label: 'Noise Reduction', icon: 'amplifier'},
              {value: 'no', label: 'Disabled', icon: 'amplifier-off'},
            ]}
          />
        </List.Section>
        <Divider />
        <List.Section>
          {/* TODO: show which models are downloaded */}
          <List.Subheader>Select model</List.Subheader>
          <RadioButton.Group
            onValueChange={value => settings.setModelName(value as ModelName)}
            value={settings.modelName}>
            {allModelNames.map(model => (
              <React.Fragment key={`fragment-${model}`}>
                <RadioButton.Item
                  key={`radio-${model}`}
                  label={model}
                  value={model}
                />
              </React.Fragment>
            ))}
          </RadioButton.Group>
        </List.Section>
      </ScrollView>
    </View>
  );
}
