import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/lib/theme';

type ProgressBarProps = {
  value: number;
  color?: string;
};

export function ProgressBar({ value, color = colors.primary }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
});
