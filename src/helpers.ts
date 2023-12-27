import {WhisperContext, initWhisper} from 'whisper.rn';
import * as FileSystem from 'expo-file-system';
import {getJournalDir, modelHost} from './constants';
import {Platform} from 'react-native';
import {unzip} from 'react-native-zip-archive';
import {ModelName, SettingsContextType} from './types';

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

export function getDummyAsset(parentDir: string, filename: string) {
  const [name, extension] = filename.split('.', 2);

  return {
    downloaded: true,
    downloading: false,
    hash: null,
    height: null,
    localUri: `${parentDir}/${filename}`,
    name,
    type: `.${extension}`,
    uri: `${parentDir}/${filename}`,
    width: null,
  };
}

// Checks if directory exists. If not, creates it
export async function ensureDirExists(dir: string) {
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    log("Directory doesn't exist, creating...");
    await FileSystem.makeDirectoryAsync(dir, {intermediates: true});
  }
}

export function writeSettings(settings: SettingsContextType) {
  log('updating settings');
  const selectedSettings = (({
    modelName,
    language,
    translate,
    noiseReduction,
  }) => ({
    modelName,
    language,
    translate,
    noiseReduction,
  }))(settings);
  const settingsString = JSON.stringify(selectedSettings);

  getJournalDir().then(journalDir => {
    FileSystem.writeAsStringAsync(journalDir + 'settings.json', settingsString);
  });
}

export async function readSettings() {
  const journalDir = await getJournalDir();
  const settingsFile = journalDir + 'settings.json';
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
