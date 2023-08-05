export type RootParamList = {
  Home: undefined;
  JournalEntry: undefined;
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
