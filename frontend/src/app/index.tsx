import { Redirect } from 'expo-router';

import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuth } from '@/lib/auth';

export default function Index() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <LoadingScreen label="Starting Spoticheck…" />;
  }

  return <Redirect href={user ? '/home' : '/sign-in'} />;
}
