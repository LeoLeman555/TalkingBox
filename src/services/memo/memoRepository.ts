// memoRepository.ts
import RNFS from 'react-native-fs';
import { getAllReminders } from '../reminder/reminderRepository';
import { ReminderStatus } from '../../domain/reminder';

/**
 * Structure sent to the ESP device.
 */
export interface MemoFile {
  version: number;
  generatedAt: string;
  deviceTimeZone: string;
  items: MemoItem[];
}

export interface MemoItem {
  memoId: string;
  title: string;
  message: string;
  startDate: string;
  time: string;
  recurrence: any | null;
  audioFile: string;
}

const STORAGE_DIR = `${RNFS.DocumentDirectoryPath}/storage`;
const MEMO_PATH = `${STORAGE_DIR}/memo.json`;
const TTS_DIR = `${RNFS.DocumentDirectoryPath}/tts`;

const MEMO_VERSION = 1;

/**
 * Builds memo structure from valid reminders.
 */
async function buildMemoFile(): Promise<MemoFile> {
  const reminders = await getAllReminders();

  const validReminders = reminders.filter(
    r => r.status === ReminderStatus.VALID,
  );

  const items: MemoItem[] = [];

  for (const r of validReminders) {
    const audioPath = `${TTS_DIR}/${r.audioFile}`;
    const exists = await RNFS.exists(audioPath);

    if (!exists) {
      throw new Error(
        `Audio file missing for reminder ${r.reminderId}`,
      );
    }

    items.push({
      memoId: r.reminderId,
      title: r.title,
      message: r.message,
      startDate: r.startDate,
      time: r.time,
      recurrence: r.recurrence ?? null,
      audioFile: r.audioFile,
    });
  }

  return {
    version: MEMO_VERSION,
    generatedAt: new Date().toISOString(),
    deviceTimeZone:
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    items,
  };
}

/**
 * Generates memo.json on disk and returns its absolute path.
 */
export async function generateMemoFile(): Promise<string> {
  const memo = await buildMemoFile();

  await RNFS.mkdir(STORAGE_DIR);

  await RNFS.writeFile(
    MEMO_PATH,
    JSON.stringify(memo, null, 2),
    'utf8',
  );

  return MEMO_PATH;
}