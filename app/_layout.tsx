import { Stack, useRouter, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { supabase } from '../supabase';

export default function Layout() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && pathname !== '/') {
        router.replace('/');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && pathname !== '/') {
        router.replace('/');
      } else if (session && pathname === '/') {
        router.replace('/home');
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="home" />
    </Stack>
  );
}