import { Slot, Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { TabBarIcon } from '../../components/TabBarIcon';
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

  if (hasSession === null) return null;

  if (!hasSession) return <Slot />;

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#007AFF',
    }}>
      <Tabs.Screen 
        name="home" 
        options={{ 
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="home" color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="discover" 
        options={{ 
          title: 'Discover',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="search" color={color} />
          ),
        }} 
      />
          <Tabs.Screen 
        name="recommend" 
        options={{ 
          title: 'Recommend',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="star" color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="favorites" 
        options={{ 
          title: 'Favorites',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="heart" color={color} />
          ),
        }} 
      />

    

  
      <Tabs.Screen 
        name="more" 
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="menu" color={color} />
          ),
        }} 
      />
       <Tabs.Screen 
        name="profile" 
        options={{
          title: 'Profile',
          href: null,
        }}
      />
 
      <Tabs.Screen 
        name="authors" 
        options={{
          title: 'Authors',
          href: null,
        }}
      />
      <Tabs.Screen 
        name="reading-progress"
        options={{
          title: 'Reading Progress',
          href: null,
        }}
      />
    </Tabs>
  );
}