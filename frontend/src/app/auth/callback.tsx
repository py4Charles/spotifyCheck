import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Screen } from '@/components/Screen';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors, radii, spacing } from '@/lib/theme';

type CallbackParams = {
  code?: string;
  access_token?: string;
  refresh_token?: string;
  error_description?: string;
};

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<CallbackParams>();
  const handled = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(true);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    async function finish() {
      if (params.error_description) {
        setError(params.error_description);
        setWorking(false);
        return;
      }

      try {
        if (params.code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
          if (exchangeError) throw exchangeError;
        } else if (params.access_token && params.refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (sessionError) throw sessionError;
        }

        router.replace('/home');
      } catch (caught) {
        setError(errorMessage(caught, 'That sign-in link is invalid or expired.'));
        setWorking(false);
      }
    }

    void finish();
  }, [params.access_token, params.code, params.error_description, params.refresh_token]);

  if (working) {
    return <LoadingScreen label="Signing you in…" />;
  }

  return (
    <Screen scroll={false} edges={['top', 'bottom']} contentStyle={styles.content}>
      <Card style={styles.card}>
        <View style={styles.icon}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
        </View>
        <AppText variant="heading">Sign-in failed</AppText>
        <AppText variant="body" color={colors.textMuted}>
          {error ?? 'This link could not be used. Request a new magic link and try again.'}
        </AppText>
        <Button title="Back to sign in" onPress={() => router.replace('/sign-in')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
  },
  card: {
    gap: spacing.md,
  },
  icon: {
    width: 54,
    height: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
