import { Frequency } from './reminder';

export type FieldErrors = {
  title?: string;
  message?: string;
  startDate?: string;
  time?: string;
  recurrence?: string;
};

export type RecurrenceUI = {
  enabled: boolean;
  frequency: Frequency;
  interval: string;
  byWeekday: number[];
  byMonthDay: number[];
  endMode: 'NEVER' | 'UNTIL' | 'COUNT';
  until?: string;
  count?: string;
};
