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

/**
 * Checks if a date is valid and respects calendar rules (YYYY-MM-DD).
 */
function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearStr, monthStr, dayStr] = value.split('-');

  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!Number.isInteger(year) || year < 1970) return false;
  if (month < 1 || month > 12) return false;

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

  /* interval */
  if (!Number.isInteger(recurrence.interval) || recurrence.interval < 1) {
    errors.push({
      field: 'recurrence.interval',
      message: 'Interval must be an integer greater than or equal to 1.',
    });
  }

  /* count / until exclusivity */
  const hasCount = recurrence.count != null;
  const hasUntil = recurrence.until != null;

  if (hasCount && hasUntil) {
    errors.push({
      field: 'recurrence',
      message: 'count and until are mutually exclusive.',
    });
  }

  if (hasCount) {
    if (!Number.isInteger(recurrence.count) || recurrence.count! <= 0) {
      errors.push({
        field: 'recurrence.count',
        message: 'count must be a positive integer.',
      });
    }
  }

  if (hasUntil && !isValidDate(recurrence.until!)) {
    errors.push({
      field: 'recurrence.until',
      message: 'until must be a valid date (YYYY-MM-DD).',
    });
  }

  /* frequency-specific rules */
  switch (recurrence.frequency) {
    case Frequency.HOURLY:
      if (!hasCount && !hasUntil) {
        errors.push({
          field: 'recurrence.frequency',
          message: 'HOURLY recurrence requires a count or an until date.',
        });
      }
      break;

    case Frequency.WEEKLY:
      if (
        !recurrence.byWeekday ||
        !Array.isArray(recurrence.byWeekday) ||
        recurrence.byWeekday.length === 0
      ) {
        errors.push({
          field: 'recurrence.byWeekday',
          message: 'WEEKLY recurrence requires at least one weekday.',
        });
      } else {
        for (const d of recurrence.byWeekday) {
          if (!Number.isInteger(d) || d < 1 || d > 7) {
            errors.push({
              field: 'recurrence.byWeekday',
              message: 'Weekday values must be integers between 1 (Monday) and 7 (Sunday).',
            });
            break;
          }
        }
      }
      break;

    case Frequency.MONTHLY:
      if (
        !recurrence.byMonthDay ||
        !Array.isArray(recurrence.byMonthDay) ||
        recurrence.byMonthDay.length === 0
      ) {
        errors.push({
          field: 'recurrence.byMonthDay',
          message: 'MONTHLY recurrence requires at least one month day.',
        });
      } else {
        for (const d of recurrence.byMonthDay) {
          if (!Number.isInteger(d) || d < 1 || d > 31) {
            errors.push({
              field: 'recurrence.byMonthDay',
              message: 'Month day values must be integers between 1 and 31.',
            });
            break;
          }
        }
      }
      break;

    case Frequency.DAILY:
    case Frequency.YEARLY:
      /* nothing extra */
      break;

    default:
      errors.push({
        field: 'recurrence.frequency',
        message: 'Unsupported recurrence frequency.',
      });
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
    JSON.stringify(previous.recurrence ?? null) !==
      JSON.stringify(next.recurrence ?? null)
  );
}
