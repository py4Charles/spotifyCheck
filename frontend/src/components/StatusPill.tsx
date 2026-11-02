import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/lib/theme';

import type { DueStatus } from '@/types';

import { AppText } from './AppText';

type StatusPillProps = {
  status: DueStatus;
  label?: string;
};

export function StatusPill({ status, label }: StatusPillProps) {
  const palette = getPalette(status);
  return (
    <View style={[styles.pill, { backgroundColor: palette.background }]}>
      <View style={[styles.dot, { backgroundColor: palette.text }]} />
      <AppText variant="tiny" color={palette.text} style={styles.text}>
        {label ?? status.toUpperCase()}
      </AppText>
    </View>
  );
}

function getPalette(status: DueStatus) {
  if (status === 'paid') {
    return { background: colors.successSoft, text: colors.success };
  }
  if (status === 'overdue') {
    return { background: colors.dangerSoft, text: colors.danger };
  }
  return { background: colors.warningSoft, text: colors.warning };
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    fontSize: 10,
  },
});
