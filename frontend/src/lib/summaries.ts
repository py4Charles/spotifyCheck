import type { BillingCycle, CycleSummary, Due, Group } from '@/types';

import { dueStatus } from './dates';

export function summarizeCycles(
  cycles: BillingCycle[],
  dues: Due[],
  group: Pick<Group, 'grace_days'>,
): CycleSummary[] {
  const duesByCycle = new Map<string, Due[]>();

  for (const due of dues) {
    const list = duesByCycle.get(due.cycle_id) ?? [];
    list.push(due);
    duesByCycle.set(due.cycle_id, list);
  }

  return cycles.map((cycle) => {
    const cycleDues = duesByCycle.get(cycle.id) ?? [];
    const paidDues = cycleDues.filter((due) => Boolean(due.paid_at));
    const overdueDues = cycleDues.filter(
      (due) => dueStatus(due, cycle, group.grace_days) === 'overdue',
    );

    return {
      cycle,
      totalCents: cycleDues.reduce((sum, due) => sum + due.amount_cents, 0),
      paidCents: paidDues.reduce((sum, due) => sum + due.amount_cents, 0),
      paidCount: paidDues.length,
      unpaidCount: cycleDues.length - paidDues.length,
      overdueCount: overdueDues.length,
    };
  });
}
