import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeIn,
  FadeInDown,
  Layout,
} from 'react-native-reanimated';
import BookModal from '../../components/BookModal';
import { supabase } from '../../supabase';

type Book = {
  id?: string;
  title: string;
  author?: string;
  description?: string;
  user_id?: string;
  category_id?: string;
  status?: string;
};

export default function DiscoverScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ──────────────────────────────────────────────────────────────
  // Auth & init
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace('/auth');
          return;
        }
        setUserId(session.user.id);
      } catch (err: any) {
        console.warn(err);
      }
    };
    init();
  }, []);

  // ──────────────────────────────────────────────────────────────
  // Search
  // ──────────────────────────────────────────────────────────────
  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  const searchGoogleBooks = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const Resp = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
          query
        )}&maxResults=10`
      );
      const data = await Resp.json();
      setResults(
        (data.items || []).map((it: any) => ({
          title: it.volumeInfo.title,
          author: it.volumeInfo.authors?.[0] ?? 'Unknown',
          description:
            it.volumeInfo.description ||
            it.volumeInfo.subtitle ||
            '',
          image:
            it.volumeInfo.imageLinks?.thumbnail ||
            it.volumeInfo.imageLinks?.smallThumbnail ||
            it.volumeInfo.imageLinks?.small ||
            null,
          info: it.volumeInfo,
        }))
      );
    } catch (err: any) {
      Alert.alert('Error', 'Failed to search Google Books');
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────
  // Add to library
  // ──────────────────────────────────────────────────────────────
  const addToLibrary = async (book: Book) => {
    if (!userId) {
      router.replace('/auth');
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        title: book.title,
        author: book.author || 'Unknown',
        description: book.description || '',
        user_id: userId,
        status: 'already read',
      };

      const apiCategories = (book as any).info?.categories || null;
      if (apiCategories?.length) {
        const catName = apiCategories[0];
        try {
          const { data: existingCat } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', userId)
            .eq('name', catName)
            .maybeSingle();

          if (existingCat) {
            payload.category_id = existingCat.id;
          } else {
            const { data: newCat } = await supabase
              .from('categories')
              .insert([{ name: catName, user_id: userId }])
              .select('*')
              .maybeSingle();
            payload.category_id = newCat?.id;
          }
        } catch (catErr) {
          console.warn('Category error', catErr);
        }
      }

      if ((book as any).image) payload.image = (book as any).image;

      let res = await supabase
        .from('books')
        .insert([payload])
        .select('*')
        .single();

      if (res.error) {
        console.warn('Insert error, retrying minimal payload', res.error);
        const retry = await supabase
          .from('books')
          .insert([
            {
              title: book.title,
              author: book.author || 'Unknown',
              description: book.description || '',
              user_id: userId,
              status: 'already read',
            },
          ])
          .select('*')
          .single();

        if (retry.error) {
          Alert.alert('Error', retry.error.message ?? 'Failed to add book');
          throw retry.error;
        }
        (res as any).data = retry.data;
      }

      const inserted = (res as any).data;
      if (inserted) {
        Alert.alert('Added', `${book.title} added to your library`);
        router.replace('/home');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add book');
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────
  // Modal helpers
  // ──────────────────────────────────────────────────────────────
  const openDetails = (b: any) => {
    setSelectedBook(b);
    setModalVisible(true);
  };
  const closeDetails = () => {
    setSelectedBook(null);
    setModalVisible(false);
  };

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#2a0845', '#0f002b']}
        style={StyleSheet.absoluteFillObject}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <Text style={styles.title}>Discover Books</Text>
            <Text style={styles.subtitle}>
              Search Google Books and add gems to your personal library.
            </Text>
          </Animated.View>

          {/* Search bar with inner clear button */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            style={styles.searchRow}
          >
            {/* Wrapper: TextInput + inner X */}
            <View style={styles.inputContainer}>
              <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />

              <TextInput
                style={styles.input}
                placeholder="Search titles, authors, keywords…"
                placeholderTextColor="#aaa"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={searchGoogleBooks}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Clear button inside input */}
              {query.length > 0 && (
                <TouchableOpacity
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.innerClearBtn}
                  onPress={clearSearch}
                >
                  <Text style={styles.innerClearBtnText}>×</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* External Search button */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.searchBtn]}
              onPress={searchGoogleBooks}
              disabled={loading}
            >
              <Text style={styles.actionBtnText}>Search</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Loading */}
          {loading && (
            <Animated.View entering={FadeIn} style={styles.loader}>
              <ActivityIndicator size="large" color="#8b5cf6" />
            </Animated.View>
          )}

          {/* Results */}
          <FlatList
            data={results}
            keyExtractor={(_, i) => `book-${i}`}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListEmptyComponent={
              <Animated.View entering={FadeIn.duration(400)} style={styles.empty}>
                <Text style={styles.emptyText}>
                  No results — try a different query.
                </Text>
              </Animated.View>
            }
            renderItem={({ item, index }) => (
              <Animated.View
                entering={FadeInDown.delay(index * 80).duration(500)}
                layout={Layout.springify()}
                style={styles.cardWrapper}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.card}
                  onPress={() => openDetails(item)}
                >
                  <View style={styles.imageContainer}>
                    {item.image ? (
                      <Image
                        source={{ uri: item.image }}
                        style={styles.cover}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.placeholderCover}>
                        <Text style={styles.placeholderText}>No Image</Text>
                      </View>
                    )}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.6)']}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardAuthor} numberOfLines={1}>
                      {item.author}
                    </Text>
                    {item.description ? (
                      <Text style={styles.cardDesc} numberOfLines={3}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => addToLibrary(item)}
                  >
                    <Text style={styles.addBtnText}>Add to Library</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Animated.View>
            )}
          />
        </View>
      </KeyboardAvoidingView>

      <BookModal
        visible={modalVisible}
        onClose={closeDetails}
        book={selectedBook}
      />
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────────
// Styles – Magnificent UI + Clear Button Inside Input
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f002b' },
  container: { flex: 1, paddingHorizontal: 16 },

  // Header
  header: { marginTop: 24, marginBottom: 20 },
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

  // Search row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: 40, // make room for X button
    fontSize: 16,
    color: '#fff',
  },
  innerClearBtn: {
    position: 'absolute',
    right: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerClearBtnText: {
    fontSize: 22,
    color: '#ccc',
    fontWeight: '600',
  },
  actionBtn: {
    marginLeft: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtn: { backgroundColor: '#8b5cf6' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  // Loader
  loader: { alignItems: 'center', marginVertical: 20 },

  // List
  listContent: { paddingBottom: 24 },
  cardWrapper: { borderRadius: 20, overflow: 'hidden' },
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

  // Image
  imageContainer: { height: 180, position: 'relative' },
  cover: { width: '30%', height: '100%', marginLeft: "35%" },
  placeholderCover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2d1b4e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { color: '#aaa', fontSize: 14 },

  // Card content
  cardContent: { padding: 16 },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e0d0ff',
    marginBottom: 4,
  },
  cardAuthor: {
    fontSize: 14,
    color: '#b794f4',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 13,
    color: '#b8a0ff',
    lineHeight: 18,
  },

  // Add button
  addBtn: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },

  // Empty state
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: '#a78bfa' },
});