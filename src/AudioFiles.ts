// One-line docstring: list and prepare access to bundled MP3 files.

import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

export interface AudioFile {
  id: string;
  label: string;
  filename: string;
}

export const AUDIO_FILES: AudioFile[] = [
  { id: 'a1', label: 'Basse', filename: 'basse.mp3' },
  { id: 'a2', label: 'V12 Engine', filename: 'V12_engine.mp3' },
];

export const prepareAudioPath = async (filename: string): Promise<string> => {
  if (Platform.OS === 'android') {
    const dst = `${RNFS.DocumentDirectoryPath}/${filename}`;
    await RNFS.copyFileAssets(`audio/${filename}`, dst);
    return dst;
  }
  return `${RNFS.MainBundlePath}/audio/${filename}`;
};
