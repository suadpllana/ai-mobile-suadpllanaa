import { Stack, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { supabase } from '../supabase';
import { analytics, trackScreenView } from '../utils/analytics';

export default function Layout() {
  const router = useRouter();
  const pathname = usePathname();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // Track screen views
  useEffect(() => {
    if (pathname) {
      trackScreenView(pathname);
    }
  }, [pathname]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setHasSession(!!session);
      
      // Set analytics user properties
      if (session?.user) {
        analytics.setUserProperties({
          user_id: session.user.id,
          email: session.user.email || '',
        });
      }
      
      // Allow some unauthenticated routes (like reset-password) to be reachable
      const allowedUnauthenticated = ['/','/auth','/reset-password'];
      const isAllowed = allowedUnauthenticated.some(p => pathname === p || pathname?.startsWith(p + '?') || pathname?.startsWith(p + '/'));

      if (!session && !isAllowed) {
        router.replace('/');
      } else if (session && pathname === '/') {
        router.replace('/home');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setHasSession(!!session);
      const allowedUnauthenticated = ['/','/auth','/reset-password'];
      const isAllowed = allowedUnauthenticated.some(p => pathname === p || pathname?.startsWith(p + '?') || pathname?.startsWith(p + '/'));

      if (!session && !isAllowed) {
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

  if (hasSession === null) return null;

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        {!hasSession && <Stack.Screen name="index" />}
        {hasSession && <Stack.Screen name="home" />}
      </Stack>
    </ErrorBoundary>
  );
}