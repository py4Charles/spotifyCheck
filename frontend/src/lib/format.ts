import { format, parseISO } from 'date-fns';

export function formatMoney(cents: number, currency = 'GHS'): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(value: string | Date, pattern = 'd MMM yyyy'): string {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, pattern);
}

export function formatDateTime(value: string | Date): string {
  return formatDate(value, 'd MMM yyyy, HH:mm');
}

export function formatMonth(value: string | Date): string {
  return formatDate(value, 'MMMM yyyy');
}

export function parseMoneyToCents(value: string): number | null {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

export function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? 'Member';
  return local
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
