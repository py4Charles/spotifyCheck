import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { queryKeys, useViewer } from '@/hooks/useAppData';
import { useCreateGroup } from '@/hooks/useMutations';
import { fetchBootstrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
  DEFAULT_GRACE_DAYS,
  DEFAULT_PLAN_COST_CENTS,
  DEFAULT_REMINDER_DAYS_BEFORE,
  DEFAULT_TIMEZONE,
} from '@/lib/constants';
import { errorMessage } from '@/lib/errors';
import { centsToInput, parseMoneyToCents } from '@/lib/format';
import { colors, radii, spacing } from '@/lib/theme';

export default function SetupScreen() {
  const { user } = useAuth();
  const viewerQuery = useViewer();
  const queryClient = useQueryClient();
  const createGroupMutation = useCreateGroup();

  const [name, setName] = useState('Spotify Family');
  const [amount, setAmount] = useState(centsToInput(DEFAULT_PLAN_COST_CENTS));
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [error, setError] = useState<string | null>(null);

  if (viewerQuery.data) {
    return <Redirect href="/home" />;
  }

  async function handleCreate() {
    if (!user) return;
    const planCostCents = parseMoneyToCents(amount);
    if (!name.trim()) {
      setError('Give your plan a name.');
      return;
    }
    if (!planCostCents) {
      setError('Enter the monthly plan total.');
      return;
    }

    setError(null);
    try {
      await createGroupMutation.mutateAsync({
        name: name.trim(),
        currency,
        planCostCents,
        reminderDaysBefore: DEFAULT_REMINDER_DAYS_BEFORE,
        graceDays: DEFAULT_GRACE_DAYS,
        timezone: DEFAULT_TIMEZONE,
      });

      await queryClient.fetchQuery({
        queryKey: queryKeys.viewer(user.id),
        queryFn: () => fetchBootstrap(user.id),
      });

      router.replace('/home');
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <Screen contentStyle={styles.content} edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <View style={styles.icon}>
          <Ionicons name="people" size={28} color={colors.primary} />
        </View>
        <AppText variant="title">Set up your plan</AppText>
        <AppText variant="body" color={colors.textMuted}>
          Add the Spotify plan you share. You can invite members and start a billing cycle next.
        </AppText>
      </View>

      <Card style={styles.card}>
        <Field
          label="Plan name"
          value={name}
          onChangeText={setName}
          placeholder="Spotify Family"
          autoCapitalize="words"
        />

        <Field
          label={`Monthly total (${currency})`}
          value={amount}
          onChangeText={setAmount}
          placeholder="16.99"
          keyboardType="decimal-pad"
          helper="The full amount you pay for the plan each month."
        />

        <View style={styles.currencyBlock}>
          <AppText variant="caption" color={colors.textMuted}>
            Currency
          </AppText>
          <View style={styles.chips}>
            {CURRENCY_OPTIONS.map((option) => {
              const active = option === currency;
              return (
                <Pressable
                  key={option}
                  onPress={() => setCurrency(option)}
                  style={({ pressed }) => [
                    styles.chip,
                    active && styles.chipActive,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <AppText variant="caption" color={active ? colors.background : colors.textMuted}>
                    {option}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error ? (
          <AppText variant="caption" color={colors.danger}>
            {error}
          </AppText>
        ) : null}

        <Button
          title="Create plan"
          icon="arrow-forward"
          loading={createGroupMutation.isPending}
          onPress={() => void handleCreate()}
        />
      </Card>

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
        <AppText variant="caption" color={colors.textMuted} style={styles.noteText}>
          Grace period is set to {DEFAULT_GRACE_DAYS} days and reminders start{' '}
          {DEFAULT_REMINDER_DAYS_BEFORE} days before the due date. You can change these in Settings.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
  },
  hero: {
    gap: spacing.sm,
  },
  icon: {
    width: 58,
    height: 58,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  card: {
    gap: spacing.lg,
  },
  currencyBlock: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipPressed: {
    opacity: 0.8,
  },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  noteText: {
    flex: 1,
  },
});
