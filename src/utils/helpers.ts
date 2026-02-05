import { RecurrenceRule, Frequency } from '../domain/reminder';

const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export function formatDate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatTime(value: Date): string {
  const h = String(value.getHours()).padStart(2, '0');
  const m = String(value.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}


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

export function formatDateHuman(value?: string): string {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

