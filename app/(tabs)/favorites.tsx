import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { supabase } from '../../supabase';

export default function FavoritesScreen() {
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // The `favorites` table is self-contained (contains title, author, image_url).
      // Use the favorites rows directly without joining to `books` or `categories`.
      setFavorites(data || []);
    } catch (err: any) {
      console.warn('Failed to load favorites', err);
      Alert.alert('Error', 'Could not load favorites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();

    const channel = supabase
      .channel('favorites-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'favorites' },
        () => loadFavorites()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const removeFavorite = async (bookId: string) => {
    Alert.alert(
      'Remove Favorite',
      'Are you sure you want to remove this book from favorites?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const userId = session?.user?.id;
              if (!userId) return;

              const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('user_id', userId)
                .eq('book_id', bookId);

              if (error) throw error;

              // Optimistically update UI
              setFavorites(prev => prev.filter(f => f.book_id !== bookId));
            } catch (err: any) {
              console.warn('Failed to remove favorite', err);
              Alert.alert('Error', 'Could not remove favorite');
              loadFavorites(); // fallback
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    return (
      <Animated.View
        entering={FadeInDown.delay(index * 70).duration(500)}
        layout={Layout.springify()}
        style={styles.cardWrapper}
      >
        <View style={styles.card}>
          <View style={styles.imageContainer}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.cover} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderCover}>
                <Text style={styles.placeholderText}>No Image</Text>
              </View>
            )}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.6)"]}
              style={StyleSheet.absoluteFillObject}
            />
          </View>

          <View style={styles.cardContentLarge}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.cardAuthor} numberOfLines={1}>{item.author}</Text>
            {item.description ? <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text> : null}

            <View style={styles.cardActionsRow}>
              <TouchableOpacity style={styles.addBtn} onPress={() => { /* optional: open detail */ }}>
                <Text style={styles.addBtnText}>View</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.removeBtn]}
                onPress={() => removeFavorite(item.book_id)}
              >
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={['#2a0845', '#0f002b']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!favorites.length) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={['#2a0845', '#0f002b']} style={StyleSheet.absoluteFillObject} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the heart on any book to save it here.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#2a0845', '#0f002b']} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.container}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <Text style={styles.title}>My Favorites</Text>
            <Text style={styles.subtitle}>Books you've loved and saved.</Text>
          </Animated.View>

          {/* List */}
          <FlatList
            data={favorites}
            keyExtractor={(item) => String(item.book_id)}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────────
// Styles – Magnificent & Consistent
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f002b' },
  container: { flex: 1, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },

  // Header
  header: { marginTop: 24, marginBottom: 16 },
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

  // Card
  cardWrapper: { borderRadius: 20, overflow: 'hidden' },

  // List
  list: { paddingBottom: 24 },

  // Loading
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#a78bfa',
  },

  // Empty
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
  // Inline card styles (used instead of BookCard)
  card: {
    backgroundColor: '#1a0033',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  imageContainer: { height: 160, position: 'relative' },
  cover: { width: '100%', height: '100%' },
  placeholderCover: { width: '100%', height: '100%', backgroundColor: '#2d1b4e', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#aaa', fontSize: 14 },
  cardContentLarge: { padding: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#e0d0ff', marginBottom: 4 },
  cardAuthor: { fontSize: 14, color: '#b794f4', marginBottom: 8 },
  cardDesc: { fontSize: 13, color: '#b8a0ff', lineHeight: 18 },
  cardActionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  addBtn: { backgroundColor: '#8b5cf6', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  addBtnText: { color: '#fff', fontWeight: '600' },
  removeBtn: { backgroundColor: '#ef4444', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  removeBtnText: { color: '#fff', fontWeight: '600' },
});