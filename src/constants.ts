import {documentDirectory} from 'expo-file-system';

export async function getJournalDir() {
  return documentDirectory + 'whisper_journal/';
}
// TODO: can allow downloading alternative models e.g. quantized models
// from https://ggml.ggerganov.com/
export const modelHost =
  'https://huggingface.co/ggerganov/whisper.cpp/resolve/main';
