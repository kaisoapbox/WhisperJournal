import React from 'react';
import {ModelName, SettingsContextType, allModelNames} from './types';

export const SettingsContext = React.createContext<SettingsContextType>({
  isThemeDark: false,
  modelName: allModelNames[0] as ModelName,
  setModelName: (() => {}) as React.Dispatch<React.SetStateAction<ModelName>>,
  language: 'auto',
  setLanguage: (() => {}) as React.Dispatch<React.SetStateAction<string>>,
  translate: true,
  setTranslate: (() => {}) as React.Dispatch<React.SetStateAction<boolean>>,
  noiseReduction: true,
  setNoiseReduction: (() => {}) as React.Dispatch<
    React.SetStateAction<boolean>
  >,
});
