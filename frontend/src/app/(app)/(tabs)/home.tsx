import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CycleCard } from '@/components/CycleCard';
import { DueRow } from '@/components/DueRow';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusPill } from '@/components/StatusPill';
import { useMembers, useMyDues, useOwnerCycleSummaries, useViewer } from '@/hooks/useAppData';
import { useRecordPayment } from '@/hooks/useMutations';
import { dueStatus, dueStatusLabel } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatMoney } from '@/lib/format';
import { summarizeCycles } from '@/lib/summaries';
import { colors, radii, spacing } from '@/lib/theme';

export default function HomeScreen() {
  const viewerQuery = useViewer();
  const viewer = viewerQuery.data;
  const isOwner = viewer?.role === 'owner';
  const group = viewer?.group;

  const membersQuery = useMembers(isOwner ? group?.id : null, true);
  const cyclesQuery = useOwnerCycleSummaries(isOwner ? group?.id : null);
  const myDuesQuery = useMyDues(!isOwner ? viewer?.id : null);
  const paymentMutation = useRecordPayment(group?.id ?? '');
  const [pendingDueId, setPendingDueId] = useState<string | null>(null);

  const membersById = useMemo(() => {
    const map = new Map((membersQuery.data ?? []).map((member) => [member.id, member]));
    return map;
  }, [membersQuery.data]);

  const activeMembers = useMemo(
    () => (membersQuery.data ?? []).filter((member) => member.status === 'active'),
    [membersQuery.data],
  );

  const currentCycle = cyclesQuery.cyclesQuery.data?.[0];
  const currentSummary = useMemo(() => {
    if (!currentCycle || !group) return null;
    const dues = (cyclesQuery.duesQuery.data ?? []).filter(
      (due) => due.cycle_id === currentCycle.id,
    );
    return summarizeCycles([currentCycle], dues, group)[0] ?? null;
  }, [currentCycle, cyclesQuery.duesQuery.data, group]);

  const currentDues = useMemo(() => {
    if (!currentCycle) return [];
    return (cyclesQuery.duesQuery.data ?? [])
      .filter((due) => due.cycle_id === currentCycle.id)
      .sort((a, b) => {
        if (Boolean(a.paid_at) !== Boolean(b.paid_at)) return a.paid_at ? 1 : -1;
        return a.created_at.localeCompare(b.created_at);
      });
  }, [currentCycle, cyclesQuery.duesQuery.data]);

  const myDues = useMemo(
    () =>
      [...(myDuesQuery.data ?? [])].sort((a, b) =>
        b.cycle.period_start.localeCompare(a.cycle.period_start),
      ),
    [myDuesQuery.data],
  );

  if (viewerQuery.isLoading && !viewer) {
    return <LoadingScreen label="Loading your plan…" />;
  }

  if (!viewer || !group) {
    return null;
  }

  const refreshing =
    viewerQuery.isRefetching ||
    membersQuery.isRefetching ||
    cyclesQuery.cyclesQuery.isRefetching ||
    cyclesQuery.duesQuery.isRefetching ||
    myDuesQuery.isRefetching;

  function refresh() {
    void viewerQuery.refetch();
    void membersQuery.refetch();
    void cyclesQuery.cyclesQuery.refetch();
    void cyclesQuery.duesQuery.refetch();
    void myDuesQuery.refetch();
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

  const firstName = viewer.display_name.split(' ')[0] || 'there';

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="caption" color={colors.textMuted}>
            {isOwner ? 'Plan owner' : 'Member'}
          </AppText>
          <AppText variant="title">Hello, {firstName}</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="settings-outline" size={21} color={colors.text} />
        </Pressable>
      </View>

      <Card style={styles.planCard}>
        <View style={styles.planTop}>
          <View style={styles.planIcon}>
            <Ionicons name="musical-notes" size={24} color={colors.primary} />
          </View>
          <View style={styles.planCopy}>
            <AppText variant="heading" numberOfLines={1}>
              {group.name}
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {formatMoney(group.plan_cost_cents, group.currency)} / month
            </AppText>
          </View>
          {isOwner ? (
            <Pressable
              onPress={() => router.push('/members')}
              style={({ pressed }) => [styles.memberCount, pressed && styles.pressed]}
            >
              <Ionicons name="people-outline" size={15} color={colors.primary} />
              <AppText variant="caption" color={colors.primary}>
                {activeMembers.length}
              </AppText>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.divider} />

        <View style={styles.planStats}>
          <View style={styles.stat}>
            <AppText variant="tiny" color={colors.textFaint}>
              {isOwner ? 'YOUR SHARE' : 'PLAN TOTAL'}
            </AppText>
            <AppText variant="heading" color={colors.primary}>
              {formatMoney(currentCycle?.share_cents ?? group.plan_cost_cents, group.currency)}
            </AppText>
          </View>
          <View style={styles.stat}>
            <AppText variant="tiny" color={colors.textFaint}>
              GRACE PERIOD
            </AppText>
            <AppText variant="heading">{group.grace_days}d</AppText>
          </View>
          <View style={styles.stat}>
            <AppText variant="tiny" color={colors.textFaint}>
              REMINDER
            </AppText>
            <AppText variant="heading">{group.reminder_days_before}d before</AppText>
          </View>
        </View>
      </Card>

      {isOwner ? (
        <>
          <SectionHeader
            title="Current cycle"
            actionLabel={cyclesQuery.cyclesQuery.data?.length ? 'History' : undefined}
            onAction={() => router.push('/history')}
          />

          {cyclesQuery.cyclesQuery.isLoading ? (
            <Card>
              <AppText variant="body" color={colors.textMuted}>
                Loading cycles…
              </AppText>
            </Card>
          ) : currentSummary && currentCycle ? (
            <CycleCard
              summary={currentSummary}
              currency={group.currency}
              graceDays={group.grace_days}
              onPress={() => router.push({ pathname: '/cycle/[id]', params: { id: currentCycle.id } })}
            />
          ) : (
            <EmptyState
              icon="calendar-outline"
              title="No billing cycle yet"
              message={
                activeMembers.length > 0
                  ? 'Create this month’s cycle to split the plan cost across your members.'
                  : 'Add the people on your plan first, then create a billing cycle.'
              }
              actionLabel={activeMembers.length > 0 ? 'Create cycle' : 'Add members'}
              onAction={() =>
                router.push(activeMembers.length > 0 ? '/cycle/new' : '/members')
              }
            />
          )}

          {currentCycle && currentDues.length > 0 ? (
            <Card style={styles.dueList}>
              <SectionHeader
                title="Payments"
                actionLabel="Open cycle"
                onAction={() =>
                  router.push({ pathname: '/cycle/[id]', params: { id: currentCycle.id } })
                }
              />
              {currentDues.map((due) => {
                const member = membersById.get(due.member_id);
                if (!member) return null;
                return (
                  <DueRow
                    key={due.id}
                    member={member}
                    due={due}
                    cycle={currentCycle}
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
              })}
            </Card>
          ) : null}

          <View style={styles.actions}>
            <Button
              title="New cycle"
              icon="add"
              onPress={() => router.push('/cycle/new')}
              style={styles.actionButton}
            />
            <Button
              title="Add member"
              icon="person-add-outline"
              variant="secondary"
              onPress={() => router.push('/members')}
              style={styles.actionButton}
            />
          </View>
        </>
      ) : (
        <MemberHome
          viewerName={viewer.display_name}
          dues={myDues}
          currency={group.currency}
          graceDays={group.grace_days}
          loading={myDuesQuery.isLoading}
        />
      )}
    </Screen>
  );
}

function MemberHome({
  viewerName,
  dues,
  currency,
  graceDays,
  loading,
}: {
  viewerName: string;
  dues: ReturnType<typeof useMyDues>['data'];
  currency: string;
  graceDays: number;
  loading: boolean;
}) {
  const latest = dues?.[0];

  return (
    <>
      <SectionHeader title="Your payment" />
      {loading ? (
        <Card>
          <AppText variant="body" color={colors.textMuted}>
            Loading your payment…
          </AppText>
        </Card>
      ) : latest ? (
        <Card style={styles.memberDueCard}>
          <View style={styles.memberDueTop}>
            <View>
              <AppText variant="caption" color={colors.textMuted}>
                {latest.cycle.label}
              </AppText>
              <AppText variant="hero" color={colors.primary}>
                {formatMoney(latest.amount_cents, currency)}
              </AppText>
            </View>
            <StatusPill
              status={dueStatus(latest, latest.cycle, graceDays)}
              label={dueStatusLabel(
                dueStatus(latest, latest.cycle, graceDays),
                latest.cycle,
                graceDays,
              )}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.memberDueMeta}>
            <View style={styles.metaItem}>
              <AppText variant="tiny" color={colors.textFaint}>
                DUE DATE
              </AppText>
              <AppText variant="bodyStrong">{formatDate(latest.cycle.due_date)}</AppText>
            </View>
            <View style={styles.metaItem}>
              <AppText variant="tiny" color={colors.textFaint}>
                PERIOD
              </AppText>
              <AppText variant="bodyStrong">
                {formatDate(latest.cycle.period_start, 'd MMM')} –{' '}
                {formatDate(latest.cycle.period_end, 'd MMM')}
              </AppText>
            </View>
          </View>
          {latest.paid_at ? (
            <View style={styles.paidNote}>
              <Ionicons name="checkmark-circle" size={17} color={colors.primary} />
              <AppText variant="caption" color={colors.primary}>
                Recorded as paid on {formatDate(latest.paid_at)}
              </AppText>
            </View>
          ) : (
            <View style={styles.paidNote}>
              <Ionicons name="information-circle" size={17} color={colors.warning} />
              <AppText variant="caption" color={colors.textMuted}>
                The plan owner records payments. You’ll get a reminder before the due date.
              </AppText>
            </View>
          )}
        </Card>
      ) : (
        <EmptyState
          icon="checkmark-done-outline"
          title="You’re all clear"
          message="No billing cycles have been created for you yet. You’ll see your share here."
        />
      )}

      {dues && dues.length > 1 ? (
        <>
          <SectionHeader
            title="Recent cycles"
            actionLabel="See all"
            onAction={() => router.push('/history')}
          />
          <Card style={styles.historyList}>
            {dues.slice(1, 4).map((due) => (
              <View key={due.id} style={styles.historyRow}>
                <Avatar name={viewerName} size={34} />
                <View style={styles.historyCopy}>
                  <AppText variant="bodyStrong">{due.cycle.label}</AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {formatMoney(due.amount_cents, currency)} · due{' '}
                    {formatDate(due.cycle.due_date, 'd MMM')}
                  </AppText>
                </View>
                <StatusPill
                  status={dueStatus(due, due.cycle, graceDays)}
                  label={dueStatusLabel(
                    dueStatus(due, due.cycle, graceDays),
                    due.cycle,
                    graceDays,
                  )}
                />
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  headerCopy: {
    gap: 2,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  planCard: {
    gap: spacing.md,
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  planIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCopy: {
    flex: 1,
    gap: 2,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  planStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flex: 1,
    gap: 3,
  },
  dueList: {
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  memberDueCard: {
    gap: spacing.md,
  },
  memberDueTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  memberDueMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  metaItem: {
    flex: 1,
    gap: 2,
  },
  paidNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  historyList: {
    gap: spacing.md,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  historyCopy: {
    flex: 1,
    gap: 2,
  },
});
