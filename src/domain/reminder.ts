/**
 * Supported recurrence frequencies.
 */
export enum Frequency {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

/**
 * Business status of a reminder.
 */
export enum ReminderStatus {
  DRAFT = 'DRAFT',
  VALID = 'VALID',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Synchronization status with the ESP device.
 */
export enum SyncStatus {
  NOT_SENT = 'NOT_SENT',
  SENDING = 'SENDING',
  SYNCED = 'SYNCED',
  ERROR = 'ERROR',
}

/**
 * Declarative recurrence rule.
 */
export interface RecurrenceRule {
  /**
   * Recurrence frequency.
   */
  frequency: Frequency;

  /**
   * Interval between each recurrence.
   * Example: interval = 2 with DAILY means every 2 days.
   */
  interval: number;

  /**
   * Used only for WEEKLY recurrence.
   * Values: 1 (Monday) → 7 (Sunday)
   */
  byWeekday: number[];

  /**
   * Used only for MONTHLY recurrence.
   * Values: 1 → 31
   */
  byMonthDay: number[];

  /**
   * Optional number of occurrences.
   * Mutually exclusive with until.
   */
  count: number | null;

  /**
   * Optional end date (YYYY-MM-DD).
   * Mutually exclusive with count.
   */
  until: string | null;
}

/**
 * Reminder represents a user intent.
 * It is a high-level, UX-oriented entity handled only by the application.
 */
export interface Reminder {
  /**
   * Unique and stable identifier (UUID v4).
   */
  reminderId: string;

  /**
   * UI category (used for filtering and readability).
   */
  category: string;

  /**
   * Short title displayed in the UI.
   * UI-only field.
   */
  title: string;

  /**
   * Text sent to the TTS engine.
   * Any change impacts audio generation.
   */
  message: string;

  /**
   * Optional UI note.
   * UI-only field.
   */
  note?: string;

  /**
   * Start date in YYYY-MM-DD format.
   */
  startDate: string;

  /**
   * Trigger time in HH:MM format.
   * Seconds are intentionally not supported.
   */
  time: string;

  /**
   * Optional recurrence rule.
   * If undefined, the reminder is a one-shot.
   */
  recurrence?: RecurrenceRule;

  /**
   * Deterministic hash of the audio content.
   */
  audioHash: string;

  /**
   * Stable reference to the audio file sent to the ESP.
   * Derived from audioHash (ex: "<hash>.mp3").
   */
  audioFile: string;

  /**
   * Business status.
   */
  status: ReminderStatus;

  /**
   * Synchronization status with the ESP.
   */
  syncStatus: SyncStatus;

  /**
   * Incremented on each change impacting MEMO generation.
   */
  revision: number;

  /**
   * Creation timestamp (ISO 8601).
   */
  createdAt: string;

  /**
   * Last update timestamp (ISO 8601).
   */
  updatedAt: string;
}
