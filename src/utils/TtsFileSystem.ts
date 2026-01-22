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

/**
 * Generate a TTS filename with a controlled extension.
 *
 * @param extension File extension (default: '.wav')
 */
export function generateTtsFilename(
  extension: '.wav' | '.mp3' = '.wav',
): string {
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
    extension
  );
}
