import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { supabase } from '../../supabase';

type Book = {
  id: string;
  title: string;
  author: string;
  description: string;
  user_id: string;
  category_id?: string;
};

type Category = {
  id: string;
  name: string;
  user_id: string;
};

export default function ProfileScreen() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: { user: u }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        setUser(u || null);

        if (u) {
          const { data: booksData, error: booksError } = await supabase
            .from('books')
            .select('*')
            .eq('user_id', u.id);
          if (booksError) throw booksError;
          setBooks(booksData || []);

          const { data: categoriesData, error: categoriesError } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', u.id);
          if (categoriesError) throw categoriesError;
          setCategories(categoriesData || []);
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            router.replace('/auth');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to sign out');
          }
        },
      },
    ]);
  };

  const handleDeleteBook = async (id: string) => {
    if (!user) return router.replace('/auth');

    Alert.alert('Delete Book', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            const { error } = await supabase
              .from('books')
              .delete()
              .eq('id', id)
              .eq('user_id', user.id);
            if (error) throw error;

            setBooks(prev => prev.filter(b => b.id !== id));
            Alert.alert('Deleted', 'Book removed from your library.');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete book');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!user) return router.replace('/auth');

    const { data: booksUsing, error } = await supabase
      .from('books')
      .select('id')
      .eq('category_id', id)
      .eq('user_id', user.id);

    if (error || (booksUsing && booksUsing.length > 0)) {
      Alert.alert('Cannot Delete', 'This category is used by one or more books.');
      return;
    }

    Alert.alert('Delete Category', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            const { error } = await supabase
              .from('categories')
              .delete()
              .eq('id', id)
              .eq('user_id', user.id);
            if (error) throw error;

            setCategories(prev => prev.filter(c => c.id !== id));
            Alert.alert('Deleted', 'Category removed.');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete category');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────
  if (loading && !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={['#2a0845', '#0f002b']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={['#2a0845', '#0f002b']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Not Signed In</Text>
          <Text style={styles.emptySubtitle}>Please sign in to view your profile.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#2a0845', '#0f002b']} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <Text style={styles.title}>My Profile</Text>
            <Text style={styles.subtitle}>Manage your account and library</Text>
          </Animated.View>

          {/* User Card */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.card}>
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />

            {/* Avatar Placeholder */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.email?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user.email}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>
                {user.user_metadata?.display_name || 'Not set'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Member Since</Text>
              <Text style={styles.value}>
                {new Date(user.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>

            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Books Section */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <Text style={styles.sectionTitle}>My Books ({books.length})</Text>
            {books.length > 0 ? (
              books.map((book, i) => (
                <Animated.View
                  key={book.id}
                  entering={FadeInDown.delay(300 + i * 50).duration(400)}
                  layout={Layout.springify()}
                  style={styles.itemCard}
                >
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {book.title}
                    </Text>
                    <Text style={styles.itemSubtitle}>
                      {book.author}
                    </Text>
                    <Text style={styles.itemCategory}>
                      {categories.find(c => c.id === book.category_id)?.name || 'Uncategorized'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteBook(book.id)}
                    disabled={loading}
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </Animated.View>
              ))
            ) : (
              <Text style={styles.emptyText}>No books in your library.</Text>
            )}
          </Animated.View>

          {/* Categories Section */}
          <Animated.View entering={FadeInDown.delay(400).duration(600)} style={{ marginTop: 24 }}>
            <Text style={styles.sectionTitle}>My Categories ({categories.length})</Text>
            {categories.length > 0 ? (
              categories.map((cat, i) => (
                <Animated.View
                  key={cat.id}
                  entering={FadeInDown.delay(500 + i * 50).duration(400)}
                  layout={Layout.springify()}
                  style={styles.itemCard}
                >
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{cat.name}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteCategory(cat.id)}
                    disabled={loading}
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </Animated.View>
              ))
            ) : (
              <Text style={styles.emptyText}>No categories created.</Text>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────────
// Styles – Magnificent & Consistent
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f002b' },
  scrollContainer: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },

  // Header
  header: { marginBottom: 24 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#e0d0ff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#c0a9ff',
    marginTop: 4,
    lineHeight: 20,
  },

  // User Card
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    padding: 20,
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  infoRow: { marginBottom: 12 },
  label: {
    fontSize: 13,
    color: '#b794f4',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#e0d0ff',
    fontWeight: '500',
  },
  signOutBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  signOutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },

  // Section
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e0d0ff',
    marginBottom: 12,
  },

  // Item Card
  itemCard: {
    backgroundColor: '#1a0033',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  itemContent: { flex: 1, marginRight: 12 },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e0d0ff',
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#b794f4',
    marginTop: 2,
  },
  itemCategory: {
    fontSize: 13,
    color: '#8b5cf6',
    marginTop: 4,
    fontStyle: 'italic',
  },
  deleteBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  deleteBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // States
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#a78bfa',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e0d0ff',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#b794f4',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 15,
    color: '#a78bfa',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});