import { StyleSheet, View } from 'react-native';

import { dueStatus, dueStatusLabel } from '@/lib/dates';
import { formatDate, formatMoney } from '@/lib/format';
import { colors, spacing } from '@/lib/theme';

import type { BillingCycle, Due, GroupMember } from '@/types';

import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { StatusPill } from './StatusPill';

type DueRowProps = {
  member: GroupMember;
  due: Due;
  cycle: BillingCycle;
  graceDays: number;
  currency: string;
  isOwner: boolean;
  loading?: boolean;
  onToggle?: (paid: boolean) => void;
};

export function DueRow({
  member,
  due,
  cycle,
  graceDays,
  currency,
  isOwner,
  loading = false,
  onToggle,
}: DueRowProps) {
  const status = dueStatus(due, cycle, graceDays);
  const label = dueStatusLabel(status, cycle, graceDays);

  return (
    <View style={styles.row}>
      <Avatar name={member.display_name} tone={status === 'paid' ? 'green' : 'neutral'} />
      <View style={styles.copy}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {member.display_name}
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {formatMoney(due.amount_cents, currency)}
          {due.paid_at
            ? ` · paid ${formatDate(due.paid_at, 'd MMM')}`
            : ` · due ${formatDate(cycle.due_date, 'd MMM')}`}
        </AppText>
        {due.note ? (
          <AppText variant="caption" color={colors.textFaint} numberOfLines={2}>
            {due.note}
          </AppText>
        ) : null}
      </View>
      <View style={styles.actions}>
        <StatusPill status={status} label={label} />
        {isOwner && onToggle ? (
          <Button
            title={status === 'paid' ? 'Undo' : 'Mark paid'}
            variant={status === 'paid' ? 'ghost' : 'secondary'}
            size="sm"
            loading={loading}
            onPress={() => onToggle(status !== 'paid')}
            style={styles.button}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 3,
    paddingTop: 2,
  },
  actions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingTop: 2,
  },
  button: {
    minWidth: 84,
  },
});
