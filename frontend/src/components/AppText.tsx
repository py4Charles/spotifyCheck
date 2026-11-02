import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, typography } from '@/lib/theme';

type Variant = keyof typeof typography;

type AppTextProps = TextProps & {
  variant?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
};

export function AppText({
  variant = 'body',
  color = colors.text,
  align,
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      style={[typography[variant], { color, textAlign: align }, style]}
    />
  );
}
