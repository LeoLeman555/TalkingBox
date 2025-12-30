import RNFS from 'react-native-fs';

const TTS_DIR = `${RNFS.DocumentDirectoryPath}/tts`;

/** Return the list of .wav files stored in the internal tts directory */
export async function listTtsWavFiles(): Promise<string[]> {
  const exists = await RNFS.exists(TTS_DIR);
  if (!exists) return [];

  const files = await RNFS.readDir(TTS_DIR);

  return files
    .filter(f => f.isFile() && f.name.endsWith('.wav'))
    .map(f => f.path)
    .sort();
}
