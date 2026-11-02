import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Field } from '@/components/Field';
import { MemberRow } from '@/components/MemberRow';
import { Screen } from '@/components/Screen';
import { useMembers, useViewer } from '@/hooks/useAppData';
import { useAddMember, useRemoveMember } from '@/hooks/useMutations';
import { errorMessage } from '@/lib/errors';
import { displayNameFromEmail, formatMoney } from '@/lib/format';
import { colors, radii, spacing } from '@/lib/theme';

export default function MembersScreen() {
  const viewerQuery = useViewer();
  const viewer = viewerQuery.data;
  const isOwner = viewer?.role === 'owner';
  const group = viewer?.group;
  const membersQuery = useMembers(isOwner ? group?.id : null);
  const addMemberMutation = useAddMember(group?.id ?? '');
  const removeMemberMutation = useRemoveMember(group?.id ?? '');

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (viewer && !isOwner) {
    return <Redirect href="/home" />;
  }

  if (!viewer || !group) {
    return null;
  }

  const members = membersQuery.data ?? [];
  const shareCents = members.length > 0 ? Math.floor(group.plan_cost_cents / members.length) : 0;

  async function handleAdd() {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setError(null);
    try {
      await addMemberMutation.mutateAsync({
        email: cleanEmail,
        displayName: name.trim() || displayNameFromEmail(cleanEmail),
      });
      setName('');
      setEmail('');
      setShowForm(false);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  function confirmRemove(memberId: string, memberName: string) {
    Alert.alert(
      `Remove ${memberName}?`,
      'They will stop appearing in new billing cycles. Past dues stay in history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void removeMemberMutation.mutateAsync(memberId).catch((caught) => {
              Alert.alert('Could not remove member', errorMessage(caught));
            });
          },
        },
      ],
    );
  }

  return (
    <Screen refreshing={membersQuery.isRefetching} onRefresh={() => void membersQuery.refetch()}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="title">Members</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {members.length} on {group.name}
          </AppText>
        </View>
        <Pressable
          onPress={() => setShowForm((value) => !value)}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Ionicons
            name={showForm ? 'close' : 'person-add-outline'}
            size={19}
            color={colors.background}
          />
        </Pressable>
      </View>

      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <AppText variant="tiny" color={colors.textFaint}>
              PLAN TOTAL
            </AppText>
            <AppText variant="heading">{formatMoney(group.plan_cost_cents, group.currency)}</AppText>
          </View>
          <View style={styles.summaryItem}>
            <AppText variant="tiny" color={colors.textFaint}>
              EQUAL SHARE
            </AppText>
            <AppText variant="heading" color={colors.primary}>
              {formatMoney(shareCents, group.currency)}
            </AppText>
          </View>
        </View>
        <AppText variant="caption" color={colors.textMuted}>
          Shares are recalculated when a cycle is created. Past cycles keep their original split.
        </AppText>
      </Card>

      {showForm ? (
        <Card style={styles.formCard}>
          <AppText variant="heading">Add a member</AppText>
          <Field
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Ama Mensah"
            autoCapitalize="words"
          />
          <Field
            label="Email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (error) setError(null);
            }}
            placeholder="ama@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={error ?? undefined}
            helper="They’ll sign in with this email to see their own status."
          />
          <Button
            title="Add member"
            icon="checkmark"
            loading={addMemberMutation.isPending}
            onPress={() => void handleAdd()}
          />
        </Card>
      ) : null}

      {membersQuery.isLoading ? (
        <Card>
          <AppText variant="body" color={colors.textMuted}>
            Loading members…
          </AppText>
        </Card>
      ) : members.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No members yet"
          message="Add the people who share your Spotify plan."
          actionLabel="Add member"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <Card style={styles.list}>
          {members.map((member, index) => (
            <View key={member.id}>
              <MemberRow
                member={member}
                right={
                  <View style={styles.memberActions}>
                    <View
                      style={[
                        styles.joinBadge,
                        member.user_id ? styles.joined : styles.pending,
                      ]}
                    >
                      <AppText
                        variant="tiny"
                        color={member.user_id ? colors.primary : colors.warning}
                        style={styles.joinText}
                      >
                        {member.user_id ? 'JOINED' : 'PENDING'}
                      </AppText>
                    </View>
                    {member.role !== 'owner' ? (
                      <Pressable
                        accessibilityLabel={`Remove ${member.display_name}`}
                        onPress={() => confirmRemove(member.id, member.display_name)}
                        hitSlop={8}
                        style={({ pressed }) => pressed && styles.pressed}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.textFaint} />
                      </Pressable>
                    ) : null}
                  </View>
                }
              />
              {index < members.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </Card>
      )}

      <View style={styles.note}>
        <Ionicons name="mail-outline" size={17} color={colors.textMuted} />
        <AppText variant="caption" color={colors.textMuted} style={styles.noteText}>
          Pending members appear automatically once they sign in with the email you added.
        </AppText>
      </View>
    </Screen>
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  summaryCard: {
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  summaryItem: {
    flex: 1,
    gap: 2,
  },
  formCard: {
    gap: spacing.lg,
  },
  list: {
    gap: spacing.md,
  },
  memberActions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  joinBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  joined: {
    backgroundColor: colors.primarySoft,
  },
  pending: {
    backgroundColor: colors.warningSoft,
  },
  joinText: {
    fontSize: 9,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
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
