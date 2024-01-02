import {WhisperContext, initWhisper} from 'whisper.rn';
import * as FileSystem from 'expo-file-system';
import {docTree, docDirName, modelHost} from './constants';
import {Platform} from 'react-native';
import {unzip} from 'react-native-zip-archive';
import {ModelName, SettingsContextType, FileDirectoryType} from './types';
import React from 'react';

// using china locale code so the date format is YMD
const formatter = new Intl.DateTimeFormat('zh-u-hc-h24', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: 'numeric',
  second: 'numeric',
  hour12: false,
});

// custom react hook to get journal directory and relevant functions/namespace
export function getSAFDir(fileDir: string): FileDirectoryType {
  return {
    fileDir,
    saf: true,
    readDirectoryAsync: FileSystem.StorageAccessFramework.readDirectoryAsync,
    makeDirectoryAsync: FileSystem.StorageAccessFramework.makeDirectoryAsync,
  };
}

export function log(message: any, fn: (message: any) => void = console.log) {
  fn(message);
}

export function getFilename(suffix: string = '.wav') {
  const currentDate = new Date();
  // YYYYMMDD-HH-MM-SS
  return (
    formatter
      .format(currentDate)
      .replaceAll('/', '')
      .replaceAll(':', '-')
      .replace(' ', '-') + suffix
  );
}

export function formatTimeString(time: number | undefined): string {
  let out: string = '';
  if (time !== undefined) {
    let seconds: number | string = Math.floor(time / 1000) % 60;
    let minutes: number | string = Math.floor(time / 1000 / 60);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      minutes = minutes % 60;
      out = out.concat(hours.toString(), ':');
    }
    minutes = minutes.toString().padStart(2, '0');
    seconds = seconds.toString().padStart(2, '0');
    out = `${out}${minutes}:${seconds}`;
  } else {
    out = '??:??';
  }
  return out;
}

export function getDummyAsset(filename: string) {
  return {
    downloaded: true,
    downloading: false,
    hash: null,
    height: null,
    localUri: filename,
    name: filename,
    type: '.wav',
    uri: filename,
    width: null,
  };
}

// Checks if directory exists. If not, creates it
export async function ensureDirExists(parentDir: string, dirName: string = '') {
  const dir = parentDir + dirName;
  try {
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      log("Directory doesn't exist, creating...");
      await FileSystem.makeDirectoryAsync(dir, {intermediates: true});
    }
  } catch (error) {
    // presumably caused by being a SAF URI, which is probably fine and ignorable
    // just try to create dir and hope nothing goes wrong
    log(`error in ensureDirExists: ${error}`);
    if (dirName !== '') {
      FileSystem.StorageAccessFramework.makeDirectoryAsync(
        parentDir,
        dirName,
      ).then((value: string) => {
        log(value);
      });
    }
  }
}

export function writeSettings(settings: SettingsContextType) {
  log('updating settings');
  const selectedSettings = (({
    modelName,
    language,
    translate,
    noiseReduction,
    journalDir,
  }) => ({
    modelName,
    language,
    translate,
    noiseReduction,
    fileDirectory: journalDir.saf ? journalDir.fileDir : undefined,
  }))(settings);
  const settingsString = JSON.stringify(selectedSettings);
  log(settingsString);
  FileSystem.writeAsStringAsync(docDirName + 'settings.json', settingsString);
}

export function readableUri(uri: string) {
  const readable = decodeURIComponent(uri);
  log(readable);
  return readable.replace(docTree, '');
}

export async function readSettings() {
  const settingsFile = docDirName + 'settings.json';
  const fileInfo = await FileSystem.getInfoAsync(settingsFile);
  if (fileInfo.exists) {
    const settingsString = await FileSystem.readAsStringAsync(settingsFile);
    log(settingsString);
    return JSON.parse(settingsString);
  } else {
    return {};
  }
}

// whisper context initialization
export async function initializeContext(
  whisperContext: WhisperContext | undefined,
  setWhisperContext: React.Dispatch<
    React.SetStateAction<WhisperContext | undefined>
  >,
  dir: string,
  modelName: ModelName,
  downloadCallback: FileSystem.FileSystemNetworkTaskProgressCallback<FileSystem.DownloadProgressData>,
) {
  if (whisperContext) {
    log('Found previous context');
    await whisperContext.release();
    setWhisperContext(undefined);
    log('Released previous context');
  }
  await ensureDirExists(dir);
  const modelFilePath = `${dir}/ggml-${modelName}.bin`;
  if ((await FileSystem.getInfoAsync(modelFilePath)).exists) {
    log(`Model ${modelName} already exists`);
  } else {
    log(`Start Download Model ${modelName}`);
    const download = FileSystem.createDownloadResumable(
      `${modelHost}/ggml-${modelName}.bin`,
      modelFilePath,
      {},
      downloadCallback,
    );
    download.downloadAsync();
  }

  // enable Core ML on iOS
  const coremlModelFilePath = `${dir}/ggml-${modelName}-encoder.mlmodelc.zip`;
  if (
    Platform.OS === 'ios' &&
    (await FileSystem.getInfoAsync(coremlModelFilePath)).exists
  ) {
    log(`Core ML Model for ${modelName} already exists`);
  } else if (Platform.OS === 'ios') {
    log(`Start Download Core ML Model for ${modelName}`);
    await FileSystem.downloadAsync(
      `${modelHost}/ggml-${modelName}-encoder.mlmodelc.zip`,
      coremlModelFilePath,
    );
    log(`Downloaded Core ML Model file for ${modelName}`);
    await unzip(coremlModelFilePath, dir);
    log(`Unzipped Core ML Model for ${modelName} successfully.`);
  }

  log('Initialize context...');
  const startTime = Date.now();
  const ctx = await initWhisper({
    filePath: modelFilePath,
    coreMLModelAsset:
      Platform.OS === 'ios'
        ? {filename: `${dir}/ggml-${modelName}-encoder.mlmodelc`, assets: []}
        : undefined,
  });
  const endTime = Date.now();
  log(`Loaded model, ID: ${ctx.id}`);
  log(`Loaded model ${modelName} in ${endTime - startTime} ms`);
  setWhisperContext(ctx);
}
