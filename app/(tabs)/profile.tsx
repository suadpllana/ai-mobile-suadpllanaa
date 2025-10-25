import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: { user: u }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setUser(u || null);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load user');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/auth');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to sign out');
    }
  };


  if (loading && !user) return (
    <View style={styles.container}><ActivityIndicator /></View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {user ? (
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user.email}</Text>

          <Text style={styles.label}>First Name</Text>
          <Text style={styles.value}>{user.user_metadata?.first_name || 'Not set'}</Text>

          <Text style={styles.label}>Last Name</Text>
          <Text style={styles.value}>{user.user_metadata?.last_name || 'Not set'}</Text>

          <Text style={styles.label}>Account Created</Text>
          <Text style={styles.value}>{new Date(user.created_at).toLocaleDateString()}</Text>

          <TouchableOpacity style={[styles.button, styles.signOut]} onPress={handleSignOut}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.loadingText}>No user data available. Please sign in.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12 },
  label: { fontSize: 14, color: '#666', marginTop: 12 },
  value: { fontSize: 16, color: '#111' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginTop: 8, backgroundColor: '#fff' },
  button: { backgroundColor: '#6366f1', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  signOut: { backgroundColor: '#dc2626' },
  buttonText: { color: '#fff', fontWeight: '600' },
  loadingText: { color: '#666', textAlign: 'center', marginTop: 20 },
});
