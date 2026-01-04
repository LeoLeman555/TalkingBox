import { Reminder, RecurrenceRule, Frequency } from './reminder';

/**
 * Validation error returned by the reminder validator.
 */
export interface ReminderValidationError {
  field: string;
  message: string;
}

function isLeapYear(year: number): boolean {
  if (year % 400 === 0) return true;
  if (year % 100 === 0) return false;
  return year % 4 === 0;
}

function getDaysInMonth(year: number, month: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

/**
 * Checks if a string is empty or whitespace.
 */
function isBlank(value: string | undefined | null): boolean {
  return !value || value.trim().length === 0;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearStr, monthStr, dayStr] = value.split('-');

  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (month < 1 || month > 12) {
    return false;
  }

  const daysInMonth = getDaysInMonth(year, month);

  return day >= 1 && day <= daysInMonth;
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
      message: 'Invalid date (calendar rules not respected).',
    });
  }

  if (!isValidTime(reminder.time)) {
    errors.push({
      field: 'time',
      message: 'Invalid time (must be in HH:MM format).',
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
