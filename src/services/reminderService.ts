import { Reminder, ReminderStatus, SyncStatus } from '../domain/reminder';
import {
  validateReminder,
  ReminderValidationError,
} from '../domain/reminderValidator';
import {
  createReminder,
  updateReminder,
  getReminderById,
} from '../storage/reminderRepository';

/**
 * Raw input coming from the UI.
 * This is NOT a Reminder.
 */
export interface CreateReminderInput {
  category: string;
  title: string;
  message: string;
  note?: string;
  startDate: string;
  time: string;
  recurrence?: any; // validated later
}

export interface CreateReminderResult {
  reminder?: Reminder;
  errors?: ReminderValidationError[];
}

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates and persists a new reminder.
 */
export async function createReminderService(
  input: CreateReminderInput,
): Promise<CreateReminderResult> {
  const now = new Date().toISOString();

  const reminder: Reminder = {
    reminderId: generateUuid(),

    category: input.category,
    title: input.title,
    message: input.message,
    note: input.note,

    startDate: input.startDate,
    time: input.time,
    recurrence: input.recurrence,

    status: ReminderStatus.VALID,
    syncStatus: SyncStatus.NOT_SENT,
    revision: 0,

    createdAt: now,
    updatedAt: now,
  };

  const errors = validateReminder(reminder);

  if (errors.length > 0) {
    return { errors };
  }

  await createReminder(reminder);

  return { reminder };
}

/**
 * Updates an existing reminder.
 */
export async function updateReminderService(
  reminderId: string,
  input: Partial<CreateReminderInput>,
): Promise<CreateReminderResult> {
  const existing = await getReminderById(reminderId);

  if (!existing) {
    return {
      errors: [{ field: 'reminderId', message: 'Reminder not found.' }],
    };
  }

  const updated: Reminder = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  };

  const errors = validateReminder(updated);

  if (errors.length > 0) {
    return { errors };
  }

  await updateReminder(updated);

  return { reminder: updated };
}
