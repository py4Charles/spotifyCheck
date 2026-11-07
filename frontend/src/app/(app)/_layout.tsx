import { Redirect, Stack, useSegments } from 'expo-router';

import { ErrorState } from '@/components/ErrorState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { usePlans } from '@/hooks/useAppData';
import { usePushTokenSync } from '@/hooks/useMutations';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { PlansProvider } from '@/lib/plans';
import { colors } from '@/lib/theme';

export default function AppLayout() {
  const { user, initializing } = useAuth();
  const segments = useSegments();
  const plansQuery = usePlans();
  usePushTokenSync();

  const onSetup = (segments as string[]).includes('setup');
  const plans = plansQuery.data ?? [];

  if (initializing) {
    return <LoadingScreen label="Loading your plan…" />;
  }

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  if (plansQuery.isLoading && !plansQuery.data) {
    return <LoadingScreen label="Loading your plan…" />;
  }

  if (plansQuery.isError && !plansQuery.data) {
    return (
      <ErrorState
        message={errorMessage(plansQuery.error)}
        onRetry={() => void plansQuery.refetch()}
      />
    );
  }

  if (plans.length === 0 && !onSetup) {
    return <Redirect href="/setup" />;
  }

  return (
    <PlansProvider plans={plans}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </PlansProvider>
  );
}
