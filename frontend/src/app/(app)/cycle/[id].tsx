import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { DetailRow } from '@/components/DetailRow';
import { DueRow } from '@/components/DueRow';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { useCycle, useCycleDues, useMembers, useViewer } from '@/hooks/useAppData';
import { useRecordPayment } from '@/hooks/useMutations';
import { dueStatus, dueStatusLabel } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatMoney } from '@/lib/format';
import { summarizeCycles } from '@/lib/summaries';
import { colors, radii, spacing } from '@/lib/theme';

export default function CycleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const viewerQuery = useViewer();
  const viewer = viewerQuery.data;
  const isOwner = viewer?.role === 'owner';
  const group = viewer?.group;

  const cycleQuery = useCycle(id);
  const duesQuery = useCycleDues(id);
  const membersQuery = useMembers(isOwner ? group?.id : null, true);
  const paymentMutation = useRecordPayment(group?.id ?? '');
  const [pendingDueId, setPendingDueId] = useState<string | null>(null);

  const membersById = useMemo(
    () => new Map((membersQuery.data ?? []).map((member) => [member.id, member])),
    [membersQuery.data],
  );

  const cycle = cycleQuery.data;
  const dues = useMemo(() => duesQuery.data ?? [], [duesQuery.data]);
  const summary = useMemo(() => {
    if (!cycle || !group) return null;
    return summarizeCycles([cycle], dues, group)[0] ?? null;
  }, [cycle, dues, group]);

  if (viewerQuery.isLoading && !viewer) {
    return <LoadingScreen label="Loading cycle…" />;
  }

  if (!viewer || !group) return null;

  if (cycleQuery.isError && !cycle) {
    return (
      <ErrorState
        message={errorMessage(cycleQuery.error)}
        onRetry={() => void cycleQuery.refetch()}
      />
    );
  }

  if (!cycle) {
    return <LoadingScreen label="Loading cycle…" />;
  }

  const myDue = dues.find((due) => due.member_id === viewer.id);
  const refreshing = cycleQuery.isRefetching || duesQuery.isRefetching || membersQuery.isRefetching;

  function refresh() {
    void cycleQuery.refetch();
    void duesQuery.refetch();
    void membersQuery.refetch();
  }

  async function togglePaid(dueId: string, paid: boolean) {
    setPendingDueId(dueId);
    try {
      await paymentMutation.mutateAsync({ dueId, paid });
    } catch (caught) {
      Alert.alert('Could not update payment', errorMessage(caught));
    } finally {
      setPendingDueId(null);
    }
  }

  const progress = summary && summary.totalCents > 0 ? summary.paidCents / summary.totalCents : 0;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title={cycle.label}
        subtitle={`${formatDate(cycle.period_start)} – ${formatDate(cycle.period_end)}`}
        showBack
      />

      {isOwner && summary ? (
        <>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View style={styles.summaryCopy}>
                <AppText variant="tiny" color={colors.textFaint}>
                  COLLECTED
                </AppText>
                <AppText variant="hero" color={colors.primary}>
                  {formatMoney(summary.paidCents, group.currency)}
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  of {formatMoney(summary.totalCents, group.currency)}
                </AppText>
              </View>
              <View style={styles.counts}>
                <View style={[styles.count, styles.paidCount]}>
                  <AppText variant="heading" color={colors.primary}>
                    {summary.paidCount}
                  </AppText>
                  <AppText variant="tiny" color={colors.primary}>
                    PAID
                  </AppText>
                </View>
                <View style={[styles.count, styles.dueCount]}>
                  <AppText variant="heading" color={colors.warning}>
                    {summary.unpaidCount}
                  </AppText>
                  <AppText variant="tiny" color={colors.warning}>
                    UNPAID
                  </AppText>
                </View>
              </View>
            </View>
            <ProgressBar value={progress} />
            <View style={styles.progressLabels}>
              <AppText variant="caption" color={colors.textMuted}>
                {Math.round(progress * 100)}% collected
              </AppText>
              <AppText variant="caption" color={colors.textMuted}>
                Due {formatDate(cycle.due_date)}
              </AppText>
            </View>
          </Card>

          <Card style={styles.detailsCard}>
            <DetailRow label="Cycle total" value={formatMoney(cycle.total_cents, group.currency)} />
            <DetailRow
              label="Equal share"
              value={formatMoney(cycle.share_cents, group.currency)}
            />
            <DetailRow label="Members" value={String(cycle.member_count)} />
            <DetailRow label="Due date" value={formatDate(cycle.due_date)} />
            <DetailRow label="Grace period" value={`${group.grace_days} days`} />
            <DetailRow
              label="Overdue"
              value={String(summary.overdueCount)}
              valueColor={summary.overdueCount > 0 ? colors.danger : colors.text}
            />
          </Card>

          <Card style={styles.dueList}>
            <View style={styles.listHeader}>
              <AppText variant="heading">Payments</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {dues.length} {dues.length === 1 ? 'member' : 'members'}
              </AppText>
            </View>
            {dues.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="No dues"
                message="This cycle has no payment records."
              />
            ) : (
              dues.map((due) => {
                const member = membersById.get(due.member_id);
                if (!member) return null;
                return (
                  <DueRow
                    key={due.id}
                    member={member}
                    due={due}
                    cycle={cycle}
                    graceDays={group.grace_days}
                    currency={group.currency}
                    isOwner
                    loading={pendingDueId === due.id}
                    onToggle={
                      member.role === 'owner'
                        ? undefined
                        : (paid) => void togglePaid(due.id, paid)
                    }
                  />
                );
              })
            )}
          </Card>
        </>
      ) : (
        <>
          {myDue ? (
            <Card style={styles.memberCard}>
              <View style={styles.memberTop}>
                <View style={styles.memberCopy}>
                  <AppText variant="tiny" color={colors.textFaint}>
                    YOUR SHARE
                  </AppText>
                  <AppText variant="hero" color={colors.primary}>
                    {formatMoney(myDue.amount_cents, group.currency)}
                  </AppText>
                </View>
                <StatusPill
                  status={dueStatus(myDue, cycle, group.grace_days)}
                  label={dueStatusLabel(
                    dueStatus(myDue, cycle, group.grace_days),
                    cycle,
                    group.grace_days,
                  )}
                />
              </View>
              <View style={styles.divider} />
              <DetailRow label="Due date" value={formatDate(cycle.due_date)} />
              <DetailRow label="Cycle total" value={formatMoney(cycle.total_cents, group.currency)} />
              <DetailRow
                label="Equal share"
                value={formatMoney(cycle.share_cents, group.currency)}
              />
              <DetailRow label="Grace period" value={`${group.grace_days} days`} />
              {myDue.paid_at ? (
                <View style={styles.paidNote}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  <AppText variant="caption" color={colors.primary}>
                    Recorded as paid on {formatDate(myDue.paid_at)}
                  </AppText>
                </View>
              ) : (
                <View style={styles.paidNote}>
                  <Ionicons name="information-circle" size={18} color={colors.warning} />
                  <AppText variant="caption" color={colors.textMuted}>
                    The plan owner records payments. Contact them if this looks wrong.
                  </AppText>
                </View>
              )}
            </Card>
          ) : (
            <EmptyState
              icon="receipt-outline"
              title="No due for this cycle"
              message="You don’t have a payment record for this cycle."
            />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: spacing.md,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summaryCopy: {
    flex: 1,
    gap: 2,
  },
  counts: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  count: {
    alignItems: 'center',
    gap: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 58,
  },
  paidCount: {
    backgroundColor: colors.primarySoft,
  },
  dueCount: {
    backgroundColor: colors.warningSoft,
  },
  progressLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  detailsCard: {
    gap: 0,
  },
  dueList: {
    gap: spacing.sm,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  memberCard: {
    gap: spacing.md,
  },
  memberTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  memberCopy: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  paidNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
  },
});
