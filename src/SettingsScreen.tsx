import React from 'react';
import {RadioButton, Text, SegmentedButtons, Divider} from 'react-native-paper';
import {SettingsContext} from './SettingsContext';
import {allModelNames} from './types';
import type {ModelName} from './types';
import {SafeAreaView} from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const settings = React.useContext(SettingsContext);
  const [toEnglish, setToEnglish] = React.useState('yes');
  return (
    <SafeAreaView>
      <Text>Settings screen</Text>
      <Text>Input Language</Text>
      <SegmentedButtons
        value={settings.language}
        onValueChange={settings.setLanguage}
        buttons={[
          {value: 'en', label: 'English', icon: 'alpha-e-circle-outline'},
          {value: 'auto', label: 'Autodetect', icon: 'web'},
        ]}
      />

      <Text>Translate to English?</Text>
      <SegmentedButtons
        value={toEnglish}
        onValueChange={value => {
          setToEnglish(value);
          settings.setTranslate(value === 'yes');
        }}
        buttons={[
          {value: 'no', label: "Don't Translate", icon: 'translate-off'},
          {value: 'yes', label: 'Translate', icon: 'translate'},
        ]}
      />
      <Text>Select model</Text>
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
            <Divider key={`divider-${model}`} />
          </React.Fragment>
        ))}
      </RadioButton.Group>
    </SafeAreaView>
  );
}
