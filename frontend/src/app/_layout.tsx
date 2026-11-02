import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/lib/auth';
import { configureNotifications } from '@/lib/push';
import { queryClient, queryPersistOptions } from '@/lib/queryClient';
import { colors } from '@/lib/theme';

void SplashScreen.preventAutoHideAsync();
configureNotifications();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={queryPersistOptions}>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { initializing } = useAuth();
  useNotificationObserver();

  useEffect(() => {
    if (!initializing) {
      void SplashScreen.hideAsync();
    }
  }, [initializing]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    />
  );
}

function useNotificationObserver() {
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!response) return;
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string') {
      router.push(url as never);
      void Notifications.clearLastNotificationResponseAsync();
    }
  }, [response]);
}
