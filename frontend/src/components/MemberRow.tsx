import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/lib/theme';

import type { GroupMember } from '@/types';

import { AppText } from './AppText';
import { Avatar } from './Avatar';

type MemberRowProps = {
  member: GroupMember;
  right?: ReactNode;
};

export function MemberRow({ member, right }: MemberRowProps) {
  return (
    <View style={styles.row}>
      <Avatar name={member.display_name} tone={member.role === 'owner' ? 'green' : 'neutral'} />
      <View style={styles.copy}>
        <View style={styles.nameRow}>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.name}>
            {member.display_name}
          </AppText>
          {member.role === 'owner' ? (
            <View style={styles.badge}>
              <AppText variant="tiny" color={colors.primary} style={styles.badgeText}>
                OWNER
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
          {member.email}
        </AppText>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
  },
  badge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
  },
});
