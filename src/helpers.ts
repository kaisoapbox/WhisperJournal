import {WhisperContext, initWhisper} from 'whisper.rn';
import * as FileSystem from 'expo-file-system';
import {modelHost} from './constants';
import {Platform} from 'react-native';
import {unzip} from 'react-native-zip-archive';
import {ModelName} from './types';

// using japan locale code so the date format is YMD
const formatter = new Intl.DateTimeFormat('ja-u-hc-h24', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

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

// Checks if directory exists. If not, creates it
export async function ensureDirExists(dir: string) {
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    console.log("Directory doesn't exist, creating...");
    await FileSystem.makeDirectoryAsync(dir, {intermediates: true});
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
) {
  if (whisperContext) {
    console.log('Found previous context');
    await whisperContext.release();
    setWhisperContext(undefined);
    console.log('Released previous context');
  }
  await ensureDirExists(dir);
  const modelFilePath = `${dir}/ggml-${modelName}.bin`;
  if ((await FileSystem.getInfoAsync(modelFilePath)).exists) {
    console.log(`Model ${modelName} already exists`);
  } else {
    console.log(`Start Download Model ${modelName}`);
    await FileSystem.downloadAsync(
      `${modelHost}/ggml-${modelName}.bin`,
      modelFilePath,
    );
  }

  // If you don't want to enable Core ML, you can remove this
  const coremlModelFilePath = `${dir}/ggml-${modelName}-encoder.mlmodelc.zip`;
  if (
    Platform.OS === 'ios' &&
    (await FileSystem.getInfoAsync(coremlModelFilePath)).exists
  ) {
    console.log(`Core ML Model for ${modelName} already exists`);
  } else if (Platform.OS === 'ios') {
    console.log(`Start Download Core ML Model for ${modelName}`);
    await FileSystem.downloadAsync(
      `${modelHost}/ggml-${modelName}-encoder.mlmodelc.zip`,
      coremlModelFilePath,
    );
    console.log(`Downloaded Core ML Model file for ${modelName}`);
    await unzip(coremlModelFilePath, dir);
    console.log(`Unzipped Core ML Model for ${modelName} successfully.`);
  }

  console.log('Initialize context...');
  const startTime = Date.now();
  const ctx = await initWhisper({filePath: modelFilePath});
  const endTime = Date.now();
  console.log('Loaded model, ID:', ctx.id);
  console.log(`Loaded model ${modelName} in ${endTime - startTime} ms`);
  setWhisperContext(ctx);
}
