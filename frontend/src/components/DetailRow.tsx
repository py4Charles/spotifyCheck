import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/lib/theme';

import { AppText } from './AppText';

type DetailRowProps = {
  label: string;
  value: string;
  valueColor?: string;
};

export function DetailRow({ label, value, valueColor = colors.text }: DetailRowProps) {
  return (
    <View style={styles.row}>
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" color={valueColor} style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
