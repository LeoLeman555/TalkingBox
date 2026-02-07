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

export function formatDateHuman(value?: string): string {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}