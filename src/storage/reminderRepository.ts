import RNFS from 'react-native-fs';
import { Reminder } from '../domain/reminder';

/**
 * Internal structure of the reminders storage file.
 */
interface ReminderStorage {
  version: number;
  items: Reminder[];
}

const STORAGE_VERSION = 1;
const STORAGE_DIR = `${RNFS.DocumentDirectoryPath}/storage`;
const REMINDERS_PATH = `${STORAGE_DIR}/reminders.json`;

async function ensureStorageExists(): Promise<void> {
  const dirExists = await RNFS.exists(STORAGE_DIR);

  if (!dirExists) {
    await RNFS.mkdir(STORAGE_DIR);
  }

  const fileExists = await RNFS.exists(REMINDERS_PATH);

  if (!fileExists) {
    const initialData: ReminderStorage = {
      version: STORAGE_VERSION,
      items: [],
    };

    await RNFS.writeFile(
      REMINDERS_PATH,
      JSON.stringify(initialData, null, 2),
      'utf8',
    );
  }
}

async function loadStorage(): Promise<ReminderStorage> {
  await ensureStorageExists();
  const content = await RNFS.readFile(REMINDERS_PATH, 'utf8');
  return JSON.parse(content) as ReminderStorage;
}

async function saveStorage(data: ReminderStorage): Promise<void> {
  await RNFS.writeFile(REMINDERS_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export async function getAllReminders(): Promise<Reminder[]> {
  const storage = await loadStorage();
  return storage.items;
}

export async function getReminderById(
  reminderId: string,
): Promise<Reminder | null> {
  const storage = await loadStorage();
  return storage.items.find(r => r.reminderId === reminderId) ?? null;
}

export async function createReminder(reminder: Reminder): Promise<void> {
  const storage = await loadStorage();
  storage.items.push(reminder);
  await saveStorage(storage);
}

export async function updateReminder(reminder: Reminder): Promise<void> {
  const storage = await loadStorage();

  const index = storage.items.findIndex(
    r => r.reminderId === reminder.reminderId,
  );

  if (index === -1) {
    throw new Error('Reminder not found.');
  }

  storage.items[index] = reminder;
  await saveStorage(storage);
}

export async function deleteReminder(reminderId: string): Promise<void> {
  const storage = await loadStorage();
  storage.items = storage.items.filter(r => r.reminderId !== reminderId);
  await saveStorage(storage);
}
