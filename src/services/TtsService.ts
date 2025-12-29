import { NativeModules, Platform } from 'react-native';

const { AndroidTts } = NativeModules;

/**
 * Result returned by native Android TTS generation.
 */
export interface TtsAudioResult {
  path: string;
  filename: string;
  size: number;
}

/**
 * TTS service (JS facade).
 *
 * Responsibilities:
 * - Validate JS-side inputs.
 * - Call native AndroidTts module.
 * - Provide structured logs for debugging.
 *
 * Limitations:
 * - Android only.
 * - Thin wrapper, no business logic.
 */
export class TtsService {
  private static log(message: string): void {
    console.log(`[TTS][JS] ${message}`);
  }

  private static ensureAndroid(): void {
    if (Platform.OS !== 'android') {
      throw new Error('[TTS][JS][PLATFORM_ERROR] Only Android supported');
    }
    if (!AndroidTts) {
      throw new Error(
        '[TTS][JS][MODULE_MISSING] AndroidTts module not available',
      );
    }
  }

  /**
   * Generate a WAV file from text using native Android TTS.
   */
  static async generate(
    text: string,
    filename: string,
  ): Promise<TtsAudioResult> {
    this.ensureAndroid();

    this.log(`[GENERATE][REQUEST][filename=${filename}]`);

    if (!text || text.trim().length === 0) {
      throw new Error('[TTS][JS][INVALID_TEXT] Text is empty');
    }

    if (!filename.endsWith('.wav')) {
      throw new Error(
        '[TTS][JS][INVALID_FILENAME] Filename must end with .wav',
      );
    }

    try {
      const result: TtsAudioResult = await AndroidTts.generate(text, filename);
      this.log(
        `[GENERATE][SUCCESS][file=${result.filename}][size=${result.size}]`,
      );
      return result;
    } catch (error: any) {
      this.log(`[GENERATE][ERROR][message=${error?.message ?? 'unknown'}]`);
      throw error;
    }
  }

  /**
   * Play a local WAV file (prototype / debug only).
   */
  static async play(internalPath: string): Promise<void> {
    this.ensureAndroid();

    this.log(`[PLAY][REQUEST][path=${internalPath}]`);

    try {
      await AndroidTts.play(internalPath);
      this.log('[PLAY][STARTED]');
    } catch (error: any) {
      this.log(`[PLAY][ERROR][message=${error?.message ?? 'unknown'}]`);
      throw error;
    }
  }

  /**
   * Export a local WAV file to public Music directory.
   */
  static async exportToMusic(
    internalPath: string,
    publicFilename: string,
  ): Promise<string> {
    this.ensureAndroid();

    this.log(`[EXPORT][REQUEST][name=${publicFilename}]`);

    if (!publicFilename.endsWith('.wav')) {
      throw new Error(
        '[TTS][JS][INVALID_FILENAME] Filename must end with .wav',
      );
    }

    try {
      const uri: string = await AndroidTts.exportToMusic(
        internalPath,
        publicFilename,
      );
      this.log(`[EXPORT][SUCCESS][uri=${uri}]`);
      return uri;
    } catch (error: any) {
      this.log(`[EXPORT][ERROR][message=${error?.message ?? 'unknown'}]`);
      throw error;
    }
  }
}
