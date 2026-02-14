import RNFS from 'react-native-fs';
import {
  getReminderById,
  deleteReminder,
  getRemindersByAudioHash,
} from './reminderRepository';

const TTS_DIR = `${RNFS.DocumentDirectoryPath}/tts`;

/**
 * Delete a reminder safely.
 * Audio file is deleted only if no other reminder references it.
 */
export async function deleteReminderService(
  reminderId: string,
): Promise<void> {
  const reminder = await getReminderById(reminderId);

  if (!reminder) {
    throw new Error('[REMINDER][DELETE] Reminder not found');
  }

  // Delete reminder first
  await deleteReminder(reminderId);

  // 2. No audio → nothing else to do
  if (!reminder.audioHash || !reminder.audioFile) {
    return;
  }

  // Check if audio is still referenced
  const remaining = await getRemindersByAudioHash(reminder.audioHash);

  if (remaining.length > 0) {
    return;
  }

  // Delete orphan audio file
  const audioPath = `${TTS_DIR}/${reminder.audioFile}`;

  const exists = await RNFS.exists(audioPath);
  if (exists) {
    await RNFS.unlink(audioPath);
  }
}
