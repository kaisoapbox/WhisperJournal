export type RootParamList = {
  Home: undefined;
  JournalEntry: {subDir: string};
  Journal: undefined;
  Record: undefined;
  Settings: undefined;
};

// TODO: create model type with model, language support, and model download path
export const allModelNames = [
  'tiny.en',
  'tiny',
  'base.en',
  'base',
  'small.en',
  'small',
] as const;

export type ModelName = (typeof allModelNames)[number];

export type SettingsContextType = {
  isThemeDark: boolean;
  modelName: ModelName;
  setModelName: React.Dispatch<React.SetStateAction<ModelName>>;
  language: string;
  setLanguage: React.Dispatch<React.SetStateAction<string>>;
  translate: boolean;
  setTranslate: React.Dispatch<React.SetStateAction<boolean>>;
  noiseReduction: boolean;
  setNoiseReduction: React.Dispatch<React.SetStateAction<boolean>>;
};
