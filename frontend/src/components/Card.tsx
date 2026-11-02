import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { colors, radii, spacing } from '@/lib/theme';

type CardProps = ViewProps & {
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({ padded = true, style, ...props }: CardProps) {
  return <View {...props} style={[styles.card, padded && styles.padded, style]} />;
}

type PressableCardProps = PressableProps & {
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PressableCard({ padded = true, style, ...props }: PressableCardProps) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.card,
        padded && styles.padded,
        pressed && styles.pressed,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.86,
    backgroundColor: colors.surfaceElevated,
  },
});
