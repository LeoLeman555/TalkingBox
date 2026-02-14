import RNFS from 'react-native-fs';

const TTS_DIR = `${RNFS.DocumentDirectoryPath}/tts`;

/**
 * Return the list of generated TTS audio files.
 * Supported formats: .wav, .mp3
 */
export async function listTtsAudioFiles(): Promise<string[]> {
  const exists = await RNFS.exists(TTS_DIR);
  if (!exists) return [];

  const files = await RNFS.readDir(TTS_DIR);

  return files
    .filter(
      f =>
        f.isFile() &&
        (f.name.endsWith('.wav') || f.name.endsWith('.mp3')),
    )
    .map(f => f.path)
    .sort();
}

export async function ensureTtsDir(): Promise<void> {
  const exists = await RNFS.exists(TTS_DIR);
  if (!exists) {
    await RNFS.mkdir(TTS_DIR);
  }
}

export function buildTtsFilePath(
  audioHash: string,
  extension: '.wav' | '.mp3' = '.wav',
): string {
  return `${TTS_DIR}/${audioHash}${extension}`;
}