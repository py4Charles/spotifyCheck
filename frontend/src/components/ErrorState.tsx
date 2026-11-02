import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/lib/theme';

import { AppText } from './AppText';
import { Button } from './Button';

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Ionicons name="warning-outline" size={26} color={colors.danger} />
      </View>
      <AppText variant="heading" align="center">
        Couldn’t load this
      </AppText>
      <AppText variant="body" color={colors.textMuted} align="center">
        {message}
      </AppText>
      {onRetry ? (
        <Button title="Try again" variant="secondary" onPress={onRetry} fullWidth={false} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
});
