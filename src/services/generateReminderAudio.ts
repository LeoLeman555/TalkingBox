// services/generateReminderAudio.ts
import { computeAudioHash } from '../utils/audioHash';
import { ensureTtsDir } from '../utils/ttsFileSystem';
import { TtsService } from './TtsService';

export async function generateReminderAudio(
  message: string,
): Promise<{ audioHash: string; audioFile: string }> {
  if (!message || !message.trim()) {
    throw new Error('[AUDIO] Message is empty');
  }

  const audioHash = computeAudioHash(message);
  const audioFile = `${audioHash}.wav`;

  await ensureTtsDir();

  await TtsService.generate(message, audioFile);

  return {
    audioHash,
    audioFile,
  };
}
