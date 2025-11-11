import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
  View
} from 'react-native';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import BookModal from '../../components/BookModal';
import { supabase } from '../../supabase';


export default function RecommendScreen() {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<any[]>([]);
  const trendingRef = useRef<FlatList<any> | null>(null);
  const [trendingIndex, setTrendingIndex] = useState(0);
  const TRENDING_ITEM_WIDTH = 140 + 100; 
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        router.replace('/auth');
        return;
      }
      setUserId(session.user.id);
      loadCuratedPicks();
      loadTrendingBooks();
    };
    init();
  }, []);

  const loadTrendingBooks = async () => {
    try {
      const resp = await fetch(
        'https://www.googleapis.com/books/v1/volumes?q=subject:fiction&orderBy=newest&maxResults=10'
      );
      const data = await resp.json();
      setTrendingBooks(formatBooks(data.items || []));
    } catch (err: any) {
      console.error('Failed to load trending books:', err);
    }
  };

  const loadCuratedPicks = async () => {
    setLoading(true);
    try {
      const resp = await fetch('https://www.googleapis.com/books/v1/volumes?q=bestseller&maxResults=12');
      const data = await resp.json();
      setRecommendations(formatBooks(data.items || []));
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const loadPersonalized = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data: userBooks } = await supabase
        .from('books')
        .select('author, title')
        .eq('user_id', userId)
        .limit(1);

      const first = userBooks?.[0];
      if (!first) {
        Alert.alert('No library', 'Add some books first for personalized suggestions.');
        setLoading(false);
        return;
      }

      const query = encodeURIComponent(first.author || first.title || 'fiction');
      const resp = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=12`);
      const data = await resp.json();
      setRecommendations(formatBooks(data.items || []));
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load personalized suggestions');
    } finally {
      setLoading(false);
    }
  };

  const formatBooks = (items: any[]) =>
    items.map((it: any) => ({
      title: it.volumeInfo.title,
      author: it.volumeInfo.authors?.[0] || 'Unknown',
      description: it.volumeInfo.description || it.volumeInfo.subtitle || '',
      image:
        it.volumeInfo.imageLinks?.thumbnail ||
        it.volumeInfo.imageLinks?.smallThumbnail ||
        null,
      info: it.volumeInfo,
    }));

  const addToLibrary = async (book: any) => {
    if (!userId) return router.replace('/auth');
    setLoading(true);
    try {
      const payload: any = {
        title: book.title,
        author: book.author || 'Unknown',
        description: book.description || '',
        user_id: userId,
        status: 'already read',
      };
      if (book.image) {
        payload.image = book.image;
        payload.cover_image = book.image;
      }

      const apiCategories = book.info?.categories || null;
      if (apiCategories?.length) {
        const catName = apiCategories[0];
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
      }

      let res = await supabase.from('books').insert([payload]).select('*').single();

      if (res.error) {
        console.warn('Insert error', res.error);
        const retry = await supabase
          .from('books')
          .insert([
            {
              title: book.title,
              author: book.author || 'Unknown',
              description: book.description || '',
              user_id: userId,
              status: 'already read',
              image: book.image || null,
              cover_image: book.image || null,
            },
          ])
          .select('*')
          .single();

        if (retry.error) {
          Alert.alert('Error', retry.error.message || 'Failed to add');
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
      Alert.alert('Error', err.message || 'Failed to add');
    } finally {
      setLoading(false);
    }
  };

  const openDetails = (b: any) => {
    setSelected(b);
    setModalVisible(true);
  };
  const closeDetails = () => {
    setSelected(null);
    setModalVisible(false);
  };

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
        <FlatList
          data={recommendations}
          keyExtractor={(_, i) => `rec-${i}`}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <Animated.View entering={FadeIn.duration(400)} style={styles.empty}>
              <Text style={styles.emptyText}>No recommendations yet.</Text>
            </Animated.View>
          }
          ListHeaderComponent={() => (
            <View style={styles.container}>
              <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
                <Text style={styles.title}>Recommendations</Text>
                <Text style={styles.subtitle}>
                  Curated picks and suggestions based on your library.
                </Text>
              </Animated.View>

              <View style={styles.pillRow}>
                <TouchableOpacity style={styles.pill} onPress={loadCuratedPicks}>
                  <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFillObject} />
                  <Text style={styles.pillText}>Curated Picks</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.pill} onPress={loadPersonalized}>
                  <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFillObject} />
                  <Text style={styles.pillText}>Based on Library</Text>
                </TouchableOpacity>
              </View>

              {loading && (
                <Animated.View entering={FadeIn} style={styles.loader}>
                  <ActivityIndicator size="large" color="#8b5cf6" />
                </Animated.View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trending Now</Text>
                <View style={{ position: 'relative' }}>
                  <TouchableOpacity
                    style={[styles.trendingArrow, { left: 6 }]}
                    onPress={() => {
                      const next = Math.max(0, trendingIndex - 1);
                      trendingRef.current?.scrollToOffset({ offset: next * TRENDING_ITEM_WIDTH, animated: true });
                      setTrendingIndex(next);
                    }}
                    accessibilityLabel="Scroll left"
                  >
                    <Ionicons name="chevron-back" size={20} color="#fff" />
                  </TouchableOpacity>

                  <FlatList
                    ref={(r) => { trendingRef.current = r; }}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={trendingBooks}
                    keyExtractor={(_, i) => `trending-${i}`} 
                    contentContainerStyle={styles.trendingList}
                    ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                    getItemLayout={(_, index) => ({ length: TRENDING_ITEM_WIDTH, offset: TRENDING_ITEM_WIDTH * index, index })}
                    onMomentumScrollEnd={(ev) => {
                      const x = ev.nativeEvent.contentOffset.x || 0;
                      const idx = Math.round(x / TRENDING_ITEM_WIDTH);
                      setTrendingIndex(idx);
                    }}
                    renderItem={({ item, index }) => (
                      <Animated.View
                        entering={FadeInDown.delay(index * 80).duration(500)}
                        layout={Layout.springify()}
                        style={styles.trendingCard}
                      >
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => openDetails(item)}
                          style={styles.trendingTouch}
                        >
                          <View style={styles.trendingImageContainer}>
                            {item.image ? (
                              <Image source={{ uri: item.image }} style={styles.trendingCover} resizeMode="cover" />
                            ) : (
                              <View style={styles.placeholder}>
                                <Text style={styles.placeholderText}>No Image</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.trendingContent}>
                            <Text style={styles.trendingTitle} numberOfLines={2}>
                              {item.title.slice(0, 13) + (item.title.length > 13 ? '...' : '')}
                            </Text>
                            <Text style={styles.trendingAuthor} numberOfLines={1}>
                              {item.author}
                            </Text>
                            <TouchableOpacity 
                              style={styles.trendingAddBtn} 
                              onPress={() => addToLibrary(item)}
                            >
                              <Text style={styles.trendingAddBtnText}>Add to Library</Text>
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    )}
                  />

                  <TouchableOpacity
                    style={[styles.trendingArrow, { right: 6 }]}
                    onPress={() => {
                      const next = Math.min((trendingBooks.length || 1) - 1, trendingIndex + 1);
                      trendingRef.current?.scrollToOffset({ offset: next * TRENDING_ITEM_WIDTH, animated: true });
                      setTrendingIndex(next);
                    }}
                    accessibilityLabel="Scroll right"
                  >
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recommended For You</Text>
              </View>
            </View>
          )}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.delay(index * 80).duration(500)}
              layout={Layout.springify()}
              style={styles.cardWrapper}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.card}
                onPress={() => openDetails(item)}
              >
                <View style={styles.imageContainer}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.cover} resizeMode="cover" />
                  ) : (
                    <View style={styles.placeholder}>
                      <Text style={styles.placeholderText}>No Image</Text>
                    </View>
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                </View>

                <View style={styles.content}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardAuthor} numberOfLines={1}>
                    {item.author}
                  </Text>
                </View>

                <TouchableOpacity style={styles.addBtn} onPress={() => addToLibrary(item)}>
                  <Text style={styles.addBtnText}>Add to Library</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      </KeyboardAvoidingView>

      <BookModal visible={modalVisible} onClose={closeDetails} book={selected} showAddToLibrary={true} addToLibrary={addToLibrary} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f002b' },
  container: { flex: 1, paddingHorizontal: 16 },
  
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e0d0ff',
    marginBottom: 16,
  },

  trendingList: {
    paddingBottom: 8,
  },
  trendingCard: {
    width: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a0033',
  },
  trendingTouch: {
    flex: 1,
  },
  trendingImageContainer: {
    height: 200,
    backgroundColor: '#2d1b4e',
  },
  trendingCover: {
    width: '100%',
    height: '100%',
  },
  trendingContent: {
    padding: 12,
  },
  trendingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e0d0ff',
    marginBottom: 4,
  },
  trendingAuthor: {
    fontSize: 12,
    color: '#b794f4',
    marginBottom: 8,
  },
  trendingAddBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  trendingAddBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },

  trendingArrow: {
    position: 'absolute',
    top: '35%',
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },

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

  pillRow: { flexDirection: 'row', marginBottom: 20, gap: 10 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
    minWidth: 120,
    alignItems: 'center',
  },
  pillText: {
    color: '#e0d0ff',
    fontWeight: '600',
    fontSize: 14,
  },

  loader: { alignItems: 'center', marginVertical: 20 },

  list: { paddingBottom: 24 },
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

  imageContainer: { height: 160, position: 'relative' },
  cover: { width: '30%', height: '100%', marginLeft: "35%" },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2d1b4e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { color: '#aaa', fontSize: 14 },

  content: { padding: 16 },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#e0d0ff',
    marginBottom: 4,
  },
  cardAuthor: {
    fontSize: 14,
    color: '#b794f4',
    marginBottom: 8,
  },

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

  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: '#a78bfa' },
});