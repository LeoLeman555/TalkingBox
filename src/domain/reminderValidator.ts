import { Reminder, RecurrenceRule, Frequency } from './reminder';

/**
 * Validation error returned by the reminder validator.
 */
export interface ReminderValidationError {
  field: string;
  message: string;
}

/**
 * Checks if a string is empty or whitespace.
 */
function isBlank(value: string | undefined | null): boolean {
  return !value || value.trim().length === 0;
}

/**
 * Checks if a date is in YYYY-MM-DD format.
 */
function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Checks if a time is in HH:MM format.
 */
function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function validateRecurrence(
  recurrence: RecurrenceRule,
): ReminderValidationError[] {
  const errors: ReminderValidationError[] = [];

  if (recurrence.interval <= 0) {
    errors.push({
      field: 'recurrence.interval',
      message: 'Interval must be greater than 0.',
    });
  }

  const hasCount = recurrence.count != null;
  const hasUntil = recurrence.until != null;

  if (hasCount && hasUntil) {
    errors.push({
      field: 'recurrence',
      message: 'count and until are mutually exclusive.',
    });
  }

  if (recurrence.count != null && recurrence.count <= 0) {
    errors.push({
      field: 'recurrence.count',
      message: 'count must be greater than 0.',
    });
  }

  if (recurrence.until != null && !isValidDate(recurrence.until)) {
    errors.push({
      field: 'recurrence.until',
      message: 'until must be a valid date (YYYY-MM-DD).',
    });
  }

  /**
   * Guard rails for HOURLY recurrence.
   */
  if (recurrence.frequency === Frequency.HOURLY) {
    if (!hasCount && !hasUntil) {
      errors.push({
        field: 'recurrence.frequency',
        message: 'HOURLY recurrence requires a count or an until date.',
      });
    }
  }

  return errors;
}

/**
 * Validates a reminder business-wise.
 * Returns a list of validation errors.
 */
export function validateReminder(
  reminder: Reminder,
): ReminderValidationError[] {
  const errors: ReminderValidationError[] = [];

  if (isBlank(reminder.title)) {
    errors.push({
      field: 'title',
      message: 'Title must not be empty.',
    });
  }

  if (isBlank(reminder.message)) {
    errors.push({
      field: 'message',
      message: 'Message must not be empty.',
    });
  }

  if (!isValidDate(reminder.startDate)) {
    errors.push({
      field: 'startDate',
      message: 'Start date must be in YYYY-MM-DD format.',
    });
  }

  if (!isValidTime(reminder.time)) {
    errors.push({
      field: 'time',
      message: 'Time must be in HH:MM format.',
    });
  }

  if (reminder.recurrence) {
    errors.push(...validateRecurrence(reminder.recurrence));
  }

  return errors;
}

/**
 * Determines whether a reminder change impacts memo generation.
 */
export function doesReminderImpactMemos(
  previous: Reminder,
  next: Reminder,
): boolean {
  return (
    previous.startDate !== next.startDate ||
    previous.time !== next.time ||
    previous.message !== next.message ||
    JSON.stringify(previous.recurrence) !== JSON.stringify(next.recurrence)
  );
}
