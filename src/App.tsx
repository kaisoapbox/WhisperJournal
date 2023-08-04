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
import {RootParamList} from './types';
import {CombinedDarkTheme, CombinedDefaultTheme} from './themes';

const Tab = createMaterialBottomTabNavigator<RootParamList>();

const Stack = createNativeStackNavigator<RootParamList>();

function HomeTabs() {
  return (
    <Tab.Navigator>
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

  const settings = React.useMemo(
    () => ({
      isThemeDark,
    }),
    [isThemeDark],
  );

  return (
    <SettingsContext.Provider value={settings}>
      <PaperProvider theme={theme}>
        <NavigationContainer theme={theme}>
          <Stack.Navigator>
            <Stack.Screen
              name="Home"
              component={HomeTabs}
              options={{headerShown: false}}
            />
            <Stack.Screen name="JournalEntry" component={JournalEntryScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SettingsContext.Provider>
  );
}
