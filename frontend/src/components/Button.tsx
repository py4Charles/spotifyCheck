import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, spacing } from '@/lib/theme';

import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = true,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const foreground = getForeground(variant);

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.small : styles.medium,
        getBackground(variant),
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={foreground} /> : null}
          <AppText
            variant={size === 'sm' ? 'caption' : 'bodyStrong'}
            color={foreground}
            style={styles.label}
          >
            {title}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

function getBackground(variant: Variant) {
  if (variant === 'secondary') return styles.secondary;
  if (variant === 'ghost') return styles.ghost;
  if (variant === 'danger') return styles.danger;
  return styles.primary;
}

function getForeground(variant: Variant): string {
  if (variant === 'primary') return colors.background;
  if (variant === 'danger') return colors.white;
  return colors.text;
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  medium: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
  },
  small: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.danger,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.995 }],
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    letterSpacing: 0.1,
  },
});
