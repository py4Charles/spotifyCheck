import { type ReactNode } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, radii, spacing, typography } from '@/lib/theme';

import { AppText } from './AppText';

type FieldProps = TextInputProps & {
  label?: string;
  error?: string;
  helper?: string;
  right?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

export function Field({
  label,
  error,
  helper,
  right,
  containerStyle,
  style,
  ...props
}: FieldProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <AppText variant="caption" color={colors.textMuted} style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        <TextInput
          {...props}
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
          style={[styles.input, style]}
        />
        {right}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.helper}>
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" color={colors.textFaint} style={styles.helper}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    marginLeft: 2,
  },
  inputWrap: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  inputError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body.fontSize,
    paddingVertical: spacing.md,
  },
  helper: {
    marginLeft: 2,
  },
});
