import { Redirect, Stack, useSegments } from 'expo-router';

import { ErrorState } from '@/components/ErrorState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useViewer } from '@/hooks/useAppData';
import { usePushTokenSync } from '@/hooks/useMutations';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { colors } from '@/lib/theme';

export default function AppLayout() {
  const { user, initializing } = useAuth();
  const segments = useSegments();
  const viewerQuery = useViewer();
  usePushTokenSync();

  const onSetup = segments.includes('setup');

  if (initializing) {
    return <LoadingScreen label="Loading your plan…" />;
  }

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  if (viewerQuery.isLoading && !viewerQuery.data) {
    return <LoadingScreen label="Loading your plan…" />;
  }

  if (viewerQuery.isError && !viewerQuery.data) {
    return (
      <ErrorState
        message={errorMessage(viewerQuery.error)}
        onRetry={() => void viewerQuery.refetch()}
      />
    );
  }

  if (!viewerQuery.data && !onSetup) {
    return <Redirect href="/setup" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
