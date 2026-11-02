import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth';
import { APP_NAME } from '@/lib/constants';
import { isSupabaseConfigured } from '@/lib/env';
import { errorMessage } from '@/lib/errors';
import { colors, radii, spacing } from '@/lib/theme';

export default function SignInScreen() {
  const { user, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Redirect href="/home" />;
  }

  async function handleSubmit() {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signIn(cleanEmail);
      setSentTo(cleanEmail);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen contentStyle={styles.content} edges={['top', 'bottom']}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Ionicons name="musical-notes" size={34} color={colors.background} />
        </View>
        <AppText variant="hero" align="center">
          {APP_NAME}
        </AppText>
        <AppText variant="body" color={colors.textMuted} align="center" style={styles.tagline}>
          The calm way to track your shared Spotify plan payments.
        </AppText>
      </View>

      {!isSupabaseConfigured ? (
        <Card style={styles.warningCard}>
          <AppText variant="bodyStrong" color={colors.warning}>
            Supabase is not connected
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to frontend/.env, then
            restart the app.
          </AppText>
        </Card>
      ) : null}

      {sentTo ? (
        <Card style={styles.card}>
          <View style={styles.mailIcon}>
            <Ionicons name="mail-unread-outline" size={26} color={colors.primary} />
          </View>
          <AppText variant="heading">Check your email</AppText>
          <AppText variant="body" color={colors.textMuted}>
            We sent a sign-in link to{' '}
            <AppText variant="bodyStrong" color={colors.text}>
              {sentTo}
            </AppText>
            . Open it on this phone to continue.
          </AppText>
          <Button
            title="Use a different email"
            variant="secondary"
            onPress={() => {
              setSentTo(null);
              setEmail('');
            }}
          />
        </Card>
      ) : (
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <AppText variant="heading">Sign in</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Use the email your plan owner added. No password needed.
            </AppText>
          </View>
          <Field
            label="Email address"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (error) setError(null);
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            error={error ?? undefined}
            editable={!loading}
            returnKeyType="send"
            onSubmitEditing={() => void handleSubmit()}
          />
          <Button
            title="Send magic link"
            icon="paper-plane-outline"
            loading={loading}
            disabled={!isSupabaseConfigured}
            onPress={() => void handleSubmit()}
          />
        </Card>
      )}

      <AppText variant="caption" color={colors.textFaint} align="center" style={styles.footer}>
        Invite-only. Payments are recorded manually by the plan owner.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  logo: {
    width: 74,
    height: 74,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    transform: [{ rotate: '-6deg' }],
  },
  tagline: {
    maxWidth: 290,
  },
  card: {
    gap: spacing.lg,
  },
  cardHeader: {
    gap: spacing.xs,
  },
  warningCard: {
    gap: spacing.sm,
    borderColor: colors.warning,
    backgroundColor: colors.warningSoft,
  },
  mailIcon: {
    width: 54,
    height: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: spacing.sm,
  },
});
