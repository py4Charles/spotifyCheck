import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DetailRow } from '@/components/DetailRow';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { useViewer } from '@/hooks/useAppData';
import { useEnablePushNotifications, useUpdateGroup } from '@/hooks/useMutations';
import { useAuth } from '@/lib/auth';
import { APP_NAME } from '@/lib/constants';
import { errorMessage } from '@/lib/errors';
import { centsToInput, formatMoney, parseMoneyToCents } from '@/lib/format';
import { colors, spacing } from '@/lib/theme';
import type { Group, Viewer } from '@/types';

export default function SettingsScreen() {
  const viewerQuery = useViewer();
  const viewer = viewerQuery.data;

  if (!viewer?.group) return null;

  return (
    <SettingsForm
      key={viewer.group.id}
      viewer={viewer}
      group={viewer.group}
      isOwner={viewer.role === 'owner'}
    />
  );
}

function SettingsForm({
  viewer,
  group,
  isOwner,
}: {
  viewer: Viewer;
  group: Group;
  isOwner: boolean;
}) {
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const updateGroupMutation = useUpdateGroup(group.id);
  const pushMutation = useEnablePushNotifications();

  const [name, setName] = useState(group.name);
  const [amount, setAmount] = useState(centsToInput(group.plan_cost_cents));
  const [currency, setCurrency] = useState(group.currency);
  const [graceDays, setGraceDays] = useState(String(group.grace_days));
  const [reminderDays, setReminderDays] = useState(String(group.reminder_days_before));
  const [timezone, setTimezone] = useState(group.timezone);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const planCostCents = parseMoneyToCents(amount);
    const grace = Number(graceDays);
    const reminder = Number(reminderDays);

    if (!name.trim()) {
      setError('Plan name is required.');
      return;
    }
    if (!planCostCents) {
      setError('Enter a valid monthly total.');
      return;
    }
    if (!Number.isInteger(grace) || grace < 0) {
      setError('Grace period must be a whole number of days.');
      return;
    }
    if (!Number.isInteger(reminder) || reminder < 0) {
      setError('Reminder days must be a whole number.');
      return;
    }

    setError(null);
    try {
      await updateGroupMutation.mutateAsync({
        name: name.trim(),
        currency: currency.trim().toUpperCase(),
        plan_cost_cents: planCostCents,
        grace_days: grace,
        reminder_days_before: reminder,
        timezone: timezone.trim(),
      });
      Alert.alert('Saved', 'Your plan settings were updated.');
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function enablePush() {
    try {
      await pushMutation.mutateAsync();
      Alert.alert('Notifications on', 'You’ll get payment reminders on this device.');
    } catch (caught) {
      Alert.alert('Could not enable notifications', errorMessage(caught));
    }
  }

  function handleSignOut() {
    Alert.alert('Sign out?', 'Your plan data stays safe in the cloud.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await signOut();
              queryClient.clear();
              router.replace('/sign-in');
            } catch (caught) {
              Alert.alert('Could not sign out', errorMessage(caught));
            }
          })();
        },
      },
    ]);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">Settings</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {isOwner ? 'Manage your plan and reminders' : 'Your account and reminders'}
        </AppText>
      </View>

      <SectionHeader title="Plan" />
      {isOwner ? (
        <Card style={styles.card}>
          <Field label="Plan name" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field
            label={`Monthly total (${currency})`}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <Field
            label="Currency"
            value={currency}
            onChangeText={setCurrency}
            autoCapitalize="characters"
            maxLength={3}
          />
          <View style={styles.rowFields}>
            <Field
              label="Grace days"
              value={graceDays}
              onChangeText={setGraceDays}
              keyboardType="number-pad"
              containerStyle={styles.rowField}
            />
            <Field
              label="Remind before"
              value={reminderDays}
              onChangeText={setReminderDays}
              keyboardType="number-pad"
              containerStyle={styles.rowField}
            />
          </View>
          <Field
            label="Timezone"
            value={timezone}
            onChangeText={setTimezone}
            autoCapitalize="none"
            autoCorrect={false}
            helper="IANA timezone, e.g. Africa/Accra."
          />
          {error ? (
            <AppText variant="caption" color={colors.danger}>
              {error}
            </AppText>
          ) : null}
          <Button
            title="Save changes"
            icon="checkmark"
            loading={updateGroupMutation.isPending}
            onPress={() => void handleSave()}
          />
        </Card>
      ) : (
        <Card style={styles.card}>
          <DetailRow label="Plan" value={group.name} />
          <DetailRow
            label="Monthly total"
            value={formatMoney(group.plan_cost_cents, group.currency)}
          />
          <DetailRow label="Grace period" value={`${group.grace_days} days`} />
          <DetailRow label="Reminder" value={`${group.reminder_days_before} days before`} />
          <DetailRow label="Timezone" value={group.timezone} />
        </Card>
      )}

      <SectionHeader title="Notifications" />
      <Card style={styles.notificationCard}>
        <View style={styles.notificationCopy}>
          <View style={styles.notificationIcon}>
            <Ionicons name="notifications-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.notificationText}>
            <AppText variant="bodyStrong">Payment reminders</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Get a push before the due date, on the due date, and daily while overdue.
            </AppText>
          </View>
        </View>
        <Button
          title="Enable on this device"
          variant="secondary"
          icon="phone-portrait-outline"
          loading={pushMutation.isPending}
          onPress={() => void enablePush()}
        />
      </Card>

      <SectionHeader title="Account" />
      <Card style={styles.card}>
        <DetailRow label="Email" value={viewer.email} />
        <DetailRow label="Role" value={isOwner ? 'Plan owner' : 'Member'} />
        <DetailRow label="App" value={`${APP_NAME} v${Constants.expoConfig?.version ?? '1.0.0'}`} />
      </Card>

      <Button title="Sign out" variant="danger" icon="log-out-outline" onPress={handleSignOut} />

      <AppText variant="caption" color={colors.textFaint} align="center" style={styles.footer}>
        Payments are recorded manually. {APP_NAME} does not connect to Spotify billing.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 2,
    paddingTop: spacing.sm,
  },
  card: {
    gap: spacing.lg,
  },
  rowFields: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowField: {
    flex: 1,
  },
  notificationCard: {
    gap: spacing.lg,
  },
  notificationCopy: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  notificationIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationText: {
    flex: 1,
    gap: 3,
  },
  footer: {
    marginTop: spacing.sm,
  },
});
