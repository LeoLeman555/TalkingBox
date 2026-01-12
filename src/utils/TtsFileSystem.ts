import RNFS from 'react-native-fs';

const TTS_DIR = `${RNFS.DocumentDirectoryPath}/tts`;

/** Return the list of .mp3 files stored in the internal tts directory */
export async function listTtsMp3Files(): Promise<string[]> {
  const exists = await RNFS.exists(TTS_DIR);
  if (!exists) return [];

  const files = await RNFS.readDir(TTS_DIR);

  return files
    .filter(f => f.isFile() && f.name.endsWith('.mp3'))
    .map(f => f.path)
    .sort();
}

export function generateTtsFilename(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    'tts_' +
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    '_' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds()) +
    '.mp3'
  );
}
