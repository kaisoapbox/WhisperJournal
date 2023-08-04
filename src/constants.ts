import {documentDirectory} from 'expo-file-system';

export async function getJournalDir() {
  return documentDirectory + 'whisper_journal/';
}

export const modelHost =
  'https://huggingface.co/ggerganov/whisper.cpp/resolve/main';
