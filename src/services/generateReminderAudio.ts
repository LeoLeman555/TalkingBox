// services/generateReminderAudio.ts
import RNFS from 'react-native-fs';
import { TtsService } from '../services/TtsService';
import { computeAudioHash } from '../utils/audioHash';

const TTS_DIR = `${RNFS.DocumentDirectoryPath}/tts`;

export interface GeneratedAudio {
  audioHash: string;
  audioFile: string;
}

/**
 * Generate (or reuse) a TTS audio file for a reminder message.
 */
export async function generateReminderAudio(
  message: string,
): Promise<GeneratedAudio> {
  if (!message || message.trim().length === 0) {
    throw new Error('[AUDIO][INVALID_MESSAGE]');
  }

  const audioHash = computeAudioHash(message);
  const audioFile = `${audioHash}.wav`;
  const audioPath = `${TTS_DIR}/${audioFile}`;

  const exists = await RNFS.exists(audioPath);
  if (exists) {
    return { audioHash, audioFile };
  }

  await RNFS.mkdir(TTS_DIR);

  const ttsResult = await TtsService.generate(message, audioFile);

  if (ttsResult.path !== audioPath) {
    await RNFS.moveFile(ttsResult.path, audioPath);
  }

  return { audioHash, audioFile };
}
