import * as FileSystem from 'expo-file-system';
import {FileDirectoryType} from './types';
export const docDirName = FileSystem.documentDirectory + 'whisper_journal/';

export const docDir: FileDirectoryType = {
  fileDir: docDirName,
  saf: false,
  readDirectoryAsync: FileSystem.readDirectoryAsync,
  makeDirectoryAsync: async (parentUri, dirName) => {
    await FileSystem.makeDirectoryAsync(parentUri + dirName, {
      intermediates: true,
    });
    return Promise.resolve(parentUri + dirName);
  },
};

// TODO: can allow downloading alternative models e.g. quantized models
// from https://ggml.ggerganov.com/
export const modelHost =
  'https://huggingface.co/ggerganov/whisper.cpp/resolve/main';

export const docTree =
  'content://com.android.externalstorage.documents/tree/primary:';
