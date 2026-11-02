import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/lib/theme';

import { AppText } from './AppText';

type LoadingScreenProps = {
  label?: string;
};

export function LoadingScreen({ label = 'Loading…' }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} size="large" />
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
});
