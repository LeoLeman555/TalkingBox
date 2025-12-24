import { NativeModules, Platform } from 'react-native';

const { AndroidTts } = NativeModules;

export interface TtsAudioResult {
  path: string;
  filename: string;
  size: number;
}

export class TtsService {
  static async generate(
    text: string,
    filename: string,
  ): Promise<TtsAudioResult> {
    if (Platform.OS !== 'android') throw new Error('Only Android supported');
    if (!AndroidTts) throw new Error('AndroidTts module not available');
    if (!text || text.trim().length === 0) throw new Error('Text is empty');
    if (!filename.endsWith('.wav'))
      throw new Error('Filename must end with .wav');
    return AndroidTts.generate(text, filename);
  }

  static async play(internalPath: string): Promise<void> {
    if (Platform.OS !== 'android') throw new Error('Only Android supported');
    return AndroidTts.play(internalPath);
  }

  static async exportToMusic(
    internalPath: string,
    publicFilename: string,
  ): Promise<string> {
    if (Platform.OS !== 'android') throw new Error('Only Android supported');
    if (!publicFilename.endsWith('.wav'))
      throw new Error('Filename must end with .wav');
    return AndroidTts.exportToMusic(internalPath, publicFilename);
  }
}
