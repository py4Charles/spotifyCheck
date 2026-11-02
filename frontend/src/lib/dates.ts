import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isAfter,
  parseISO,
  startOfDay,
  startOfMonth,
} from 'date-fns';

import type { BillingCycle, Due, DueStatus } from '@/types';

export function toDateInput(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function todayInput(): string {
  return toDateInput(new Date());
}

export function startOfCurrentMonthInput(): string {
  return toDateInput(startOfMonth(new Date()));
}

export function endOfCurrentMonthInput(): string {
  return toDateInput(endOfMonth(new Date()));
}

export function defaultDueDateInput(): string {
  const now = new Date();
  const fifth = new Date(now.getFullYear(), now.getMonth(), 5);
  if (isAfter(startOfDay(now), startOfDay(fifth))) {
    return toDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 5));
  }
  return toDateInput(fifth);
}

export function defaultCycleLabel(): string {
  return format(new Date(), 'MMMM yyyy');
}

export function dueStatus(
  due: Pick<Due, 'paid_at'>,
  cycle: Pick<BillingCycle, 'due_date'>,
  graceDays: number,
  now = new Date(),
): DueStatus {
  if (due.paid_at) return 'paid';
  const graceEnds = addDays(parseISO(cycle.due_date), graceDays);
  if (isAfter(startOfDay(now), startOfDay(graceEnds))) return 'overdue';
  return 'unpaid';
}

export function daysUntilDue(cycle: Pick<BillingCycle, 'due_date'>, now = new Date()): number {
  return differenceInCalendarDays(parseISO(cycle.due_date), startOfDay(now));
}

export function dueStatusLabel(
  status: DueStatus,
  cycle: Pick<BillingCycle, 'due_date'>,
  graceDays: number,
  now = new Date(),
): string {
  if (status === 'paid') return 'Paid';
  if (status === 'overdue') {
    const overdueBy = Math.abs(daysUntilDue(cycle, now)) - graceDays;
    return overdueBy <= 1 ? 'Overdue' : `Overdue ${overdueBy}d`;
  }
  const days = daysUntilDue(cycle, now);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days > 1) return `Due in ${days}d`;
  return 'Due';
}

export function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseISO(value);
  return !Number.isNaN(parsed.getTime()) && toDateInput(parsed) === value;
}
