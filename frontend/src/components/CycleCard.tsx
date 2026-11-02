import { StyleSheet, View } from 'react-native';

import { dueStatusLabel } from '@/lib/dates';
import { formatDate, formatMoney } from '@/lib/format';
import { colors, radii, spacing } from '@/lib/theme';

import type { CycleSummary } from '@/types';

import { AppText } from './AppText';
import { PressableCard } from './Card';
import { ProgressBar } from './ProgressBar';

type CycleCardProps = {
  summary: CycleSummary;
  currency: string;
  graceDays: number;
  onPress: () => void;
};

export function CycleCard({ summary, currency, graceDays, onPress }: CycleCardProps) {
  const { cycle } = summary;
  const progress = summary.totalCents > 0 ? summary.paidCents / summary.totalCents : 0;
  const isOpen = cycle.status === 'open';

  return (
    <PressableCard onPress={onPress} style={styles.card}>
      <View style={styles.top}>
        <View style={styles.copy}>
          <AppText variant="bodyStrong">{cycle.label}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {formatDate(cycle.period_start, 'd MMM')} – {formatDate(cycle.period_end, 'd MMM yyyy')}
          </AppText>
        </View>
        <View style={[styles.badge, isOpen ? styles.openBadge : styles.closedBadge]}>
          <AppText
            variant="tiny"
            color={isOpen ? colors.primary : colors.textMuted}
            style={styles.badgeText}
          >
            {isOpen ? 'OPEN' : 'CLOSED'}
          </AppText>
        </View>
      </View>

      <ProgressBar value={progress} />

      <View style={styles.bottom}>
        <AppText variant="caption" color={colors.textMuted}>
          {formatMoney(summary.paidCents, currency)} of {formatMoney(summary.totalCents, currency)}
        </AppText>
        <AppText
          variant="caption"
          color={summary.overdueCount > 0 ? colors.danger : colors.textMuted}
        >
          {summary.overdueCount > 0
            ? `${summary.overdueCount} overdue`
            : summary.unpaidCount > 0
              ? `${summary.unpaidCount} unpaid`
              : 'All paid'}
        </AppText>
      </View>

      <View style={styles.due}>
        <AppText variant="caption" color={colors.textMuted}>
          Due {formatDate(cycle.due_date)}
        </AppText>
        <AppText
          variant="caption"
          color={summary.overdueCount > 0 ? colors.danger : colors.textMuted}
        >
          {dueStatusLabel(
            summary.overdueCount > 0 ? 'overdue' : summary.unpaidCount > 0 ? 'unpaid' : 'paid',
            cycle,
            graceDays,
          )}
        </AppText>
      </View>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  openBadge: {
    backgroundColor: colors.primarySoft,
  },
  closedBadge: {
    backgroundColor: colors.surfaceElevated,
  },
  badgeText: {
    fontSize: 9,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  due: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
});
