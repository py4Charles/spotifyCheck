import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { useMembers, useViewer } from '@/hooks/useAppData';
import { useCreateCycle } from '@/hooks/useMutations';
import {
  defaultCycleLabel,
  defaultDueDateInput,
  endOfCurrentMonthInput,
  isValidDateInput,
  startOfCurrentMonthInput,
} from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { centsToInput, formatMoney, parseMoneyToCents } from '@/lib/format';
import { colors, spacing } from '@/lib/theme';
import type { Group } from '@/types';

export default function NewCycleScreen() {
  const viewerQuery = useViewer();
  const viewer = viewerQuery.data;
  const isOwner = viewer?.role === 'owner';

  if (viewer && !isOwner) {
    return <Redirect href="/home" />;
  }

  if (!viewer?.group) return null;

  return <NewCycleForm key={viewer.group.id} group={viewer.group} />;
}

function NewCycleForm({ group }: { group: Group }) {
  const membersQuery = useMembers(group.id);
  const createCycleMutation = useCreateCycle(group.id);

  const [label, setLabel] = useState(defaultCycleLabel());
  const [periodStart, setPeriodStart] = useState(startOfCurrentMonthInput());
  const [periodEnd, setPeriodEnd] = useState(endOfCurrentMonthInput());
  const [dueDate, setDueDate] = useState(defaultDueDateInput());
  const [amount, setAmount] = useState(centsToInput(group.plan_cost_cents));
  const [error, setError] = useState<string | null>(null);

  const members = membersQuery.data ?? [];
  const totalCents = parseMoneyToCents(amount);
  const shareCents = totalCents && members.length > 0 ? Math.floor(totalCents / members.length) : 0;

  async function handleCreate() {
    const total = parseMoneyToCents(amount);
    if (!label.trim()) {
      setError('Add a label for this cycle.');
      return;
    }
    if (!isValidDateInput(periodStart) || !isValidDateInput(periodEnd) || !isValidDateInput(dueDate)) {
      setError('Use YYYY-MM-DD for all dates.');
      return;
    }
    if (periodEnd < periodStart) {
      setError('Period end must be on or after period start.');
      return;
    }
    if (dueDate < periodStart) {
      setError('Due date must be on or after period start.');
      return;
    }
    if (!total) {
      setError('Enter a valid cycle total.');
      return;
    }
    if (members.length === 0) {
      setError('Add members before creating a cycle.');
      return;
    }

    setError(null);
    try {
      const cycle = await createCycleMutation.mutateAsync({
        label: label.trim(),
        periodStart,
        periodEnd,
        dueDate,
        totalCents: total,
      });
      router.replace({ pathname: '/cycle/[id]', params: { id: cycle.id } });
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <Screen>
      <PageHeader
        title="New cycle"
        subtitle={group.name}
        showBack
      />

      <Card style={styles.card}>
        <Field label="Cycle label" value={label} onChangeText={setLabel} placeholder="November 2026" />
        <Field
          label="Period start"
          value={periodStart}
          onChangeText={setPeriodStart}
          placeholder="2026-11-01"
          keyboardType="numbers-and-punctuation"
          helper="YYYY-MM-DD"
        />
        <Field
          label="Period end"
          value={periodEnd}
          onChangeText={setPeriodEnd}
          placeholder="2026-11-30"
          keyboardType="numbers-and-punctuation"
          helper="YYYY-MM-DD"
        />
        <Field
          label="Due date"
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="2026-11-05"
          keyboardType="numbers-and-punctuation"
          helper="When members should pay their share."
        />
        <Field
          label={`Total for this cycle (${group.currency})`}
          value={amount}
          onChangeText={setAmount}
          placeholder="16.99"
          keyboardType="decimal-pad"
          helper={`Prefilled from your plan total of ${formatMoney(group.plan_cost_cents, group.currency)}.`}
        />

        <View style={styles.preview}>
          <View style={styles.previewIcon}>
            <Ionicons name="people-outline" size={21} color={colors.primary} />
          </View>
          <View style={styles.previewCopy}>
            <AppText variant="bodyStrong">
              {members.length > 0
                ? `${formatMoney(shareCents, group.currency)} each`
                : 'Add members to split this cycle'}
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {members.length > 0
                ? `${members.length} active members · equal split`
                : 'Go to Members and add everyone first.'}
            </AppText>
          </View>
        </View>

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={17} color={colors.textMuted} />
          <AppText variant="caption" color={colors.textMuted} style={styles.noteText}>
            Your own share is marked paid automatically. Past cycles keep their original member count
            and split.
          </AppText>
        </View>

        {error ? (
          <AppText variant="caption" color={colors.danger}>
            {error}
          </AppText>
        ) : null}

        <Button
          title="Create cycle"
          icon="checkmark"
          loading={createCycleMutation.isPending}
          onPress={() => void handleCreate()}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    padding: spacing.md,
  },
  previewIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCopy: {
    flex: 1,
    gap: 2,
  },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  noteText: {
    flex: 1,
  },
});
