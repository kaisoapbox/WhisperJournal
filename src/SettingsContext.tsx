import React from 'react';
import {ModelName, allModelNames} from './types';

export const SettingsContext = React.createContext({
  isThemeDark: false,
  modelName: allModelNames[0] as ModelName,
  setModelName: (() => {}) as React.Dispatch<React.SetStateAction<ModelName>>,
  language: 'auto',
  setLanguage: (() => {}) as React.Dispatch<React.SetStateAction<string>>,
  translate: false,
  setTranslate: (() => {}) as React.Dispatch<React.SetStateAction<boolean>>,
});
