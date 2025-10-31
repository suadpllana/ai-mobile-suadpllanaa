import { Stack, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Layout() {
  const router = useRouter();
  const pathname = usePathname();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setHasSession(!!session);
      if (!session && pathname !== '/') {
        router.replace('/');
      } else if (session && pathname === '/') {
        router.replace('/home');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setHasSession(!!session);
      if (!session && pathname !== '/') {
        router.replace('/');
      } else if (session && pathname === '/') {
        router.replace('/home');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  // Avoid flicker while we determine auth status
  if (hasSession === null) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Only include the index screen when not authenticated */}
      {!hasSession && <Stack.Screen name="index" />}
      {/* Only include home when authenticated (keeps routes tidy) */}
      {hasSession && <Stack.Screen name="home" />}
    </Stack>
  );
}