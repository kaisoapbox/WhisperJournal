import React from 'react';

import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {NavigationContainer} from '@react-navigation/native';
import {createMaterialBottomTabNavigator} from 'react-native-paper/react-navigation';
import {PaperProvider} from 'react-native-paper';
import {useColorScheme} from 'react-native';

import {SettingsContext} from './SettingsContext';
import JournalScreen from './JournalScreen';
import RecordScreen from './RecordScreen';
import SettingsScreen from './SettingsScreen';
import JournalEntryScreen from './JournalEntryScreen';
import type {ModelName, RootParamList} from './types';
import {FileDirectoryType, allModelNames} from './types';
import {getSAFDir, readSettings, writeSettings} from './helpers';
import {CombinedDarkTheme, CombinedDefaultTheme} from './themes';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {docDir} from './constants';

const Tab = createMaterialBottomTabNavigator<RootParamList>();

const Stack = createNativeStackNavigator<RootParamList>();

function HomeTabs() {
  return (
    <Tab.Navigator initialRouteName="Record">
      <Tab.Screen
        name="Journal"
        component={JournalScreen}
        options={{tabBarIcon: 'book'}}
      />
      <Tab.Screen
        name="Record"
        component={RecordScreen}
        options={{tabBarIcon: 'record-circle'}}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{tabBarIcon: 'cog'}}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const isThemeDark = useColorScheme() === 'dark';
  const theme = isThemeDark ? CombinedDarkTheme : CombinedDefaultTheme;

  const [modelName, setModelName] = React.useState<ModelName>(allModelNames[0]);
  const [language, setLanguage] = React.useState('auto');
  const [translate, setTranslate] = React.useState(true);
  const [noiseReduction, setNoiseReduction] = React.useState(true);
  const [shouldWrite, setShouldWrite] = React.useState(false);
  const [journalDir, setJournalDir] = React.useState<FileDirectoryType>(docDir);
  const settings = React.useMemo(() => {
    const _settings = {
      isThemeDark,
      modelName,
      setModelName,
      language,
      setLanguage,
      translate,
      setTranslate,
      noiseReduction,
      setNoiseReduction,
      journalDir,
      setJournalDir,
    };
    if (shouldWrite) {
      writeSettings(_settings);
    }
    return _settings;
  }, [
    isThemeDark,
    modelName,
    setModelName,
    language,
    setLanguage,
    translate,
    setTranslate,
    noiseReduction,
    setNoiseReduction,
    shouldWrite,
    journalDir,
    setJournalDir,
  ]);

  // to initialize settings
  React.useEffect(() => {
    readSettings().then(_settings => {
      if (_settings.modelName !== undefined) {
        setModelName(_settings.modelName);
      }
      if (_settings.language !== undefined) {
        setLanguage(_settings.language);
      }
      if (_settings.translate !== undefined) {
        setTranslate(_settings.translate);
      }
      if (_settings.noiseReduction !== undefined) {
        setNoiseReduction(_settings.noiseReduction);
      }
      if (_settings.fileDirectory !== undefined) {
        setJournalDir(getSAFDir(_settings.fileDirectory));
      }
      setShouldWrite(true);
    });
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <NavigationContainer theme={theme}>
            <Stack.Navigator>
              <Stack.Screen
                name="Home"
                component={HomeTabs}
                options={{headerShown: false}}
              />
              <Stack.Screen
                name="JournalEntry"
                component={JournalEntryScreen}
                options={{headerTitle: 'View Journal Entry'}}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </SettingsContext.Provider>
  );
}
