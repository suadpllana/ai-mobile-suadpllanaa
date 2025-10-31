import { Slot, Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';

export default function Layout() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setHasSession(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setHasSession(!!session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // while we don't know session status, don't render anything to avoid flicker
  if (hasSession === null) return null;

  // If there's no session, render the child route (e.g. sign-in / sign-up index page)
  if (!hasSession) return <Slot />;

  // Only render tabs when user is authenticated
  return (
    <Tabs>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="books" options={{ title: 'Books' }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="recommend" options={{ title: 'Recommend' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favorites' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}