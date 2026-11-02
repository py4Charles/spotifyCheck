import { StyleSheet, View } from 'react-native';

import { initials } from '@/lib/format';
import { colors, radii } from '@/lib/theme';

import { AppText } from './AppText';

type AvatarProps = {
  name: string;
  size?: number;
  tone?: 'green' | 'neutral';
};

export function Avatar({ name, size = 42, tone = 'neutral' }: AvatarProps) {
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radii.pill,
          backgroundColor: tone === 'green' ? colors.primarySoft : colors.surfaceElevated,
        },
      ]}
    >
      <AppText
        variant="caption"
        color={tone === 'green' ? colors.primary : colors.text}
        style={{ fontSize: Math.max(11, size * 0.32), fontWeight: '700' }}
      >
        {initials(name) || '?'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
