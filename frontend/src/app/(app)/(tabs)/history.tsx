import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card, PressableCard } from '@/components/Card';
import { CycleCard } from '@/components/CycleCard';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { useMyDues, useOwnerCycleSummaries, useViewer } from '@/hooks/useAppData';
import { dueStatus, dueStatusLabel } from '@/lib/dates';
import { formatDate, formatMoney } from '@/lib/format';
import { summarizeCycles } from '@/lib/summaries';
import { colors, spacing } from '@/lib/theme';

export default function HistoryScreen() {
  const viewerQuery = useViewer();
  const viewer = viewerQuery.data;
  const isOwner = viewer?.role === 'owner';
  const group = viewer?.group;

  const ownerSummaries = useOwnerCycleSummaries(isOwner ? group?.id : null);
  const myDuesQuery = useMyDues(!isOwner ? viewer?.id : null);

  const summaries = useMemo(() => {
    if (!isOwner || !group) return [];
    return summarizeCycles(
      ownerSummaries.cyclesQuery.data ?? [],
      ownerSummaries.duesQuery.data ?? [],
      group,
    );
  }, [group, isOwner, ownerSummaries.cyclesQuery.data, ownerSummaries.duesQuery.data]);

  const myDues = useMemo(
    () =>
      [...(myDuesQuery.data ?? [])].sort((a, b) =>
        b.cycle.period_start.localeCompare(a.cycle.period_start),
      ),
    [myDuesQuery.data],
  );

  if (!viewer || !group) return null;

  const loading = isOwner
    ? ownerSummaries.cyclesQuery.isLoading ||
      (ownerSummaries.cycleIds.length > 0 && ownerSummaries.duesQuery.isLoading)
    : myDuesQuery.isLoading;

  const refreshing = isOwner
    ? ownerSummaries.cyclesQuery.isRefetching || ownerSummaries.duesQuery.isRefetching
    : myDuesQuery.isRefetching;

  function refresh() {
    if (isOwner) {
      void ownerSummaries.cyclesQuery.refetch();
      void ownerSummaries.duesQuery.refetch();
    } else {
      void myDuesQuery.refetch();
    }
  }

  const empty = isOwner ? summaries.length === 0 : myDues.length === 0;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <AppText variant="title">History</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {isOwner ? 'Every cycle for your plan' : 'Your payment record'}
        </AppText>
      </View>

      {loading ? (
        <Card>
          <AppText variant="body" color={colors.textMuted}>
            Loading history…
          </AppText>
        </Card>
      ) : empty ? (
        <EmptyState
          icon="time-outline"
          title="No history yet"
          message={
            isOwner
              ? 'Billing cycles you create will appear here with their payment progress.'
              : 'Your payment history will appear here after the owner creates a cycle.'
          }
        />
      ) : isOwner ? (
        <View style={styles.list}>
          {summaries.map((summary) => (
            <CycleCard
              key={summary.cycle.id}
              summary={summary}
              currency={group.currency}
              graceDays={group.grace_days}
              onPress={() =>
                router.push({ pathname: '/cycle/[id]', params: { id: summary.cycle.id } })
              }
            />
          ))}
        </View>
      ) : (
        <View style={styles.list}>
          {myDues.map((due) => {
            const status = dueStatus(due, due.cycle, group.grace_days);
            return (
              <PressableCard
                key={due.id}
                onPress={() =>
                  router.push({ pathname: '/cycle/[id]', params: { id: due.cycle.id } })
                }
                style={styles.memberCard}
              >
                <View style={styles.memberTop}>
                  <View style={styles.memberCopy}>
                    <AppText variant="bodyStrong">{due.cycle.label}</AppText>
                    <AppText variant="caption" color={colors.textMuted}>
                      Due {formatDate(due.cycle.due_date)}
                    </AppText>
                  </View>
                  <StatusPill
                    status={status}
                    label={dueStatusLabel(status, due.cycle, group.grace_days)}
                  />
                </View>
                <View style={styles.memberBottom}>
                  <AppText variant="heading" color={status === 'paid' ? colors.text : colors.primary}>
                    {formatMoney(due.amount_cents, group.currency)}
                  </AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {due.paid_at ? `Paid ${formatDate(due.paid_at)}` : 'Not paid yet'}
                  </AppText>
                </View>
              </PressableCard>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 2,
    paddingTop: spacing.sm,
  },
  list: {
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
  memberBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
