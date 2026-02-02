import RNFS from 'react-native-fs';
import { Reminder } from '../domain/reminder';

/**
 * Internal structure of the reminders storage file.
 * This file is app-internal and never sent as-is to the ESP.
 */
interface ReminderStorage {
  version: number;
  items: Reminder[];
}

const STORAGE_VERSION = 1;

const STORAGE_DIR = `${RNFS.DocumentDirectoryPath}/storage`;
const REMINDERS_PATH = `${STORAGE_DIR}/reminders.json`;

/**
 * Ensures that the storage directory and file exist.
 * Creates them if missing.
 */
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

/**
 * Loads and parses the reminders storage file.
 * Throws if the file is corrupted or incompatible.
 */
async function loadStorage(): Promise<ReminderStorage> {
  await ensureStorageExists();

  const content = await RNFS.readFile(REMINDERS_PATH, 'utf8');

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Reminders storage is corrupted (invalid JSON).');
  }

  const storage = parsed as ReminderStorage;

  if (storage.version !== STORAGE_VERSION) {
    throw new Error(
      `Unsupported reminders storage version: ${storage.version}`,
    );
  }

  if (!Array.isArray(storage.items)) {
    throw new Error('Reminders storage format is invalid.');
  }

  return storage;
}

/**
 * Persists the full reminders storage atomically.
 */
async function saveStorage(data: ReminderStorage): Promise<void> {
  await RNFS.writeFile(
    REMINDERS_PATH,
    JSON.stringify(data, null, 2),
    'utf8',
  );
}

/**
 * Returns all reminders.
 */
export async function getAllReminders(): Promise<Reminder[]> {
  const storage = await loadStorage();
  return [...storage.items];
}

/**
 * Returns a reminder by its identifier.
 */
export async function getReminderById(
  reminderId: string,
): Promise<Reminder | null> {
  const storage = await loadStorage();
  return storage.items.find(r => r.reminderId === reminderId) ?? null;
}

/**
 * Persists a new reminder.
 * Fails if a reminder with the same ID already exists.
 */
export async function createReminder(reminder: Reminder): Promise<void> {
  const storage = await loadStorage();

  const exists = storage.items.some(
    r => r.reminderId === reminder.reminderId,
  );

  if (exists) {
    throw new Error(`Reminder already exists: ${reminder.reminderId}`);
  }

  storage.items.push(reminder);
  await saveStorage(storage);
}

/**
 * Updates an existing reminder.
 */
export async function updateReminder(reminder: Reminder): Promise<void> {
  const storage = await loadStorage();

  const index = storage.items.findIndex(
    r => r.reminderId === reminder.reminderId,
  );

  if (index === -1) {
    throw new Error(`Reminder not found: ${reminder.reminderId}`);
  }

  storage.items[index] = reminder;
  await saveStorage(storage);
}

/**
 * Deletes a reminder by its identifier.
 */
export async function deleteReminder(reminderId: string): Promise<void> {
  const storage = await loadStorage();

  const initialLength = storage.items.length;

  storage.items = storage.items.filter(
    r => r.reminderId !== reminderId,
  );

  if (storage.items.length === initialLength) {
    throw new Error(`Reminder not found: ${reminderId}`);
  }

  await saveStorage(storage);
}
