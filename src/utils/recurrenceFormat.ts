import { RecurrenceRule, Frequency } from '../domain/reminder';

const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export function formatRecurrenceHuman(
  recurrence: RecurrenceRule,
): string {
  const parts: string[] = [];

  /* base frequency */
  switch (recurrence.frequency) {
    case Frequency.DAILY:
      parts.push(
        recurrence.interval === 1
          ? 'Tous les jours'
          : `Tous les ${recurrence.interval} jours`,
      );
      break;

    case Frequency.WEEKLY: {
      const days =
        recurrence.byWeekday?.map(d => WEEKDAYS[d - 1]).join(', ') ?? '';
      parts.push(
        recurrence.interval === 1
          ? 'Toutes les semaines'
          : `Toutes les ${recurrence.interval} semaines`,
      );
      if (days) {
        parts.push(`(${days})`);
      }
      break;
    }

    case Frequency.MONTHLY: {
      const days =
        recurrence.byMonthDay?.join(', ') ?? '';
      parts.push(
        recurrence.interval === 1
          ? 'Tous les mois'
          : `Tous les ${recurrence.interval} mois`,
      );
      if (days) {
        parts.push(`les ${days}`);
      }
      break;
    }

    case Frequency.YEARLY:
      parts.push(
        recurrence.interval === 1
          ? 'Tous les ans'
          : `Tous les ${recurrence.interval} ans`,
      );
      break;

    default:
      return 'Répétition invalide';
  }

  /* end condition */
  if (recurrence.count != null) {
    parts.push(`(${recurrence.count} occurrences)`);
  }

  if (recurrence.until != null) {
    parts.push(`jusqu’au ${recurrence.until}`);
  }

  return parts.join(' ');
}

export function formatSyncStatus(value: string): string {
  switch (value) {
    case 'SYNCED':
      return 'Synchronisé';
    case 'SENDING':
      return 'En cours de synchronisation';
    case 'ERROR':
      return 'Erreur de synchronisation';
    case 'NOT_SENT':
      return 'Non synchronisé';
    default:
      return value;
  }
}