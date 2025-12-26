import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    Vibration,
    View
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn, SlideInRight, Layout } from 'react-native-reanimated';
import BookModal from '../../components/BookModal';
import { supabase } from '../../supabase';

const { width } = Dimensions.get('window');

// Genre categories for exploration
const GENRES = [
  { id: 'fiction', name: 'Fiction', emoji: '📖', color: '#8b5cf6' },
  { id: 'mystery', name: 'Mystery', emoji: '🔍', color: '#ef4444' },
  { id: 'romance', name: 'Romance', emoji: '💕', color: '#ec4899' },
  { id: 'science', name: 'Science', emoji: '🔬', color: '#06b6d4' },
  { id: 'history', name: 'History', emoji: '🏛️', color: '#f59e0b' },
  { id: 'fantasy', name: 'Fantasy', emoji: '🐉', color: '#10b981' },
  { id: 'thriller', name: 'Thriller', emoji: '😱', color: '#6366f1' },
  { id: 'biography', name: 'Biography', emoji: '👤', color: '#84cc16' },
  { id: 'self-help', name: 'Self-Help', emoji: '🧠', color: '#f97316' },
  { id: 'poetry', name: 'Poetry', emoji: '🎭', color: '#a855f7' },
];

// Reading moods
const MOODS = [
  { id: 'adventurous', name: 'Adventurous', emoji: '🏔️', query: 'adventure exploration' },
  { id: 'relaxing', name: 'Relaxing', emoji: '🌊', query: 'cozy comfort light' },
  { id: 'inspiring', name: 'Inspiring', emoji: '✨', query: 'motivational inspiring success' },
  { id: 'mysterious', name: 'Mysterious', emoji: '🌙', query: 'mystery suspense dark' },
  { id: 'romantic', name: 'Romantic', emoji: '🌹', query: 'romance love story' },
  { id: 'intellectual', name: 'Intellectual', emoji: '🎓', query: 'philosophy science thinking' },
];

// Time periods for exploration
const TIME_PERIODS = [
  { id: 'classic', name: 'Classics', years: '1800-1950', emoji: '📜' },
  { id: 'modern', name: 'Modern', years: '1950-2000', emoji: '📚' },
  { id: 'contemporary', name: 'Contemporary', years: '2000-2024', emoji: '🆕' },
];

export default function RecommendScreen() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<any[]>([]);
  const trendingRef = useRef<FlatList<any> | null>(null);
  const [trendingIndex, setTrendingIndex] = useState(0);
  const TRENDING_ITEM_WIDTH = 140 + 100; 
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  
  // New state for enhanced features
  const [activeTab, setActiveTab] = useState<'curated' | 'personalized' | 'mood' | 'genre'>('curated');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list' | 'grid'>('cards');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [showTimePeriodModal, setShowTimePeriodModal] = useState(false);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [dailyPick, setDailyPick] = useState<any>(null);
  const [showDailyPickModal, setShowDailyPickModal] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'title' | 'author' | 'newest'>('relevance');
  const [bookmarked, setBookmarked] = useState<any[]>([]);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);

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
      loadDailyPick();
      loadSavedBookmarks();
    };
    init();
  }, []);

  // Load daily pick
  const loadDailyPick = async () => {
    try {
      const resp = await fetch('https://www.googleapis.com/books/v1/volumes?q=bestseller&maxResults=20');
      const data = await resp.json();
      const books = formatBooks(data.items || []);
      // Pick based on day of year for consistency
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      setDailyPick(books[dayOfYear % books.length]);
    } catch (err) {
      console.error('Failed to load daily pick:', err);
    }
  };

  // Load saved bookmarks from local state (would be AsyncStorage in production)
  const loadSavedBookmarks = async () => {
    // In a real app, load from AsyncStorage
    setBookmarked([]);
  };

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Vibration.vibrate(50);
    await Promise.all([loadCuratedPicks(), loadTrendingBooks(), loadDailyPick()]);
    setRefreshing(false);
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
      setActiveTab('curated');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  // Load by genre
  const loadByGenre = async (genre: string) => {
    setLoading(true);
    setSelectedGenre(genre);
    setActiveTab('genre');
    Vibration.vibrate(30);
    try {
      const resp = await fetch(`https://www.googleapis.com/books/v1/volumes?q=subject:${genre}&maxResults=20`);
      const data = await resp.json();
      setRecommendations(formatBooks(data.items || []));
      setShowGenreModal(false);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load genre books');
    } finally {
      setLoading(false);
    }
  };

  // Load by mood
  const loadByMood = async (mood: typeof MOODS[0]) => {
    setLoading(true);
    setSelectedMood(mood.id);
    setActiveTab('mood');
    Vibration.vibrate(30);
    try {
      const resp = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(mood.query)}&maxResults=20`);
      const data = await resp.json();
      setRecommendations(formatBooks(data.items || []));
      setShowMoodModal(false);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load mood-based books');
    } finally {
      setLoading(false);
    }
  };

  // Load by time period
  const loadByTimePeriod = async (period: typeof TIME_PERIODS[0]) => {
    setLoading(true);
    setSelectedTimePeriod(period.id);
    Vibration.vibrate(30);
    try {
      const query = period.id === 'classic' ? 'classic literature' : 
                   period.id === 'modern' ? 'modern literature' : 'contemporary fiction';
      const resp = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20`);
      const data = await resp.json();
      setRecommendations(formatBooks(data.items || []));
      setShowTimePeriodModal(false);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  // Search functionality
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    Vibration.vibrate(30);
    
    // Add to recent searches
    setRecentSearches(prev => {
      const updated = [searchQuery, ...prev.filter(s => s !== searchQuery)].slice(0, 5);
      return updated;
    });
    
    try {
      const resp = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=20`);
      const data = await resp.json();
      setRecommendations(formatBooks(data.items || []));
    } catch (err) {
      Alert.alert('Error', 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Toggle favorite
  const toggleFavorite = (bookId: string) => {
    Vibration.vibrate(30);
    setFavorites(prev => {
      const updated = new Set(prev);
      if (updated.has(bookId)) {
        updated.delete(bookId);
      } else {
        updated.add(bookId);
      }
      return updated;
    });
  };

  // Toggle bookmark for later
  const toggleBookmark = (book: any) => {
    Vibration.vibrate(30);
    setBookmarked(prev => {
      const exists = prev.find(b => b.title === book.title);
      if (exists) {
        return prev.filter(b => b.title !== book.title);
      }
      return [...prev, book];
    });
  };

  // Share book
  const shareBook = async (book: any) => {
    Vibration.vibrate(30);
    try {
      await Share.share({
        message: `📚 Check out "${book.title}" by ${book.author}!\n\nI found this great book recommendation.`,
        title: book.title,
      });
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  // Sort recommendations
  const getSortedRecommendations = () => {
    let sorted = [...recommendations];
    switch (sortBy) {
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'author':
        sorted.sort((a, b) => a.author.localeCompare(b.author));
        break;
      case 'newest':
        sorted.reverse();
        break;
      default:
        break;
    }
    return sorted;
  };

  // Pick random book
  const pickRandomBook = () => {
    if (recommendations.length === 0) return;
    Vibration.vibrate([0, 50, 50, 50]);
    const random = recommendations[Math.floor(Math.random() * recommendations.length)];
    setSelected(random);
    setModalVisible(true);
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
    items.map((it: any, idx: number) => ({
      id: it.id || `book-${idx}`,
      title: it.volumeInfo.title,
      author: it.volumeInfo.authors?.[0] || 'Unknown',
      description: it.volumeInfo.description || it.volumeInfo.subtitle || '',
      image:
        it.volumeInfo.imageLinks?.thumbnail ||
        it.volumeInfo.imageLinks?.smallThumbnail ||
        null,
      info: it.volumeInfo,
      publishedDate: it.volumeInfo.publishedDate || '',
      pageCount: it.volumeInfo.pageCount || 0,
      categories: it.volumeInfo.categories || [],
      rating: it.volumeInfo.averageRating || 0,
      ratingsCount: it.volumeInfo.ratingsCount || 0,
      language: it.volumeInfo.language || 'en',
    }));

  const addToLibrary = async (book: any) => {
    if (!userId) return router.replace('/auth');
    setLoading(true);
    try {
      // Check for duplicate by title and author
      const { data: existing } = await supabase
        .from('books')
        .select('id')
        .eq('user_id', userId)
        .eq('title', book.title)
        .eq('author', book.author || 'Unknown')
        .maybeSingle();
      if (existing) {
        Alert.alert('Duplicate', 'This book is already in your library.');
        setLoading(false);
        return;
      }

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

  // Render book card based on view mode
  const renderBookCard = ({ item, index }: { item: any; index: number }) => {
    const isFav = favorites.has(item.id);
    const isBookmarked = bookmarked.find(b => b.title === item.title);
    
    if (viewMode === 'grid') {
      return (
        <Animated.View entering={ZoomIn.delay(index * 50).duration(400)} style={styles.gridCard}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => openDetails(item)}>
            <View style={styles.gridImageContainer}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.gridCover} resizeMode="cover" />
              ) : (
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderText}>📚</Text>
                </View>
              )}
              <View style={styles.gridOverlay}>
                <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={styles.gridFavBtn}>
                  <Ionicons name={isFav ? "heart" : "heart-outline"} size={16} color={isFav ? "#ef4444" : "#fff"} />
                </TouchableOpacity>
              </View>
              {item.rating > 0 && (
                <View style={styles.gridRating}>
                  <Ionicons name="star" size={10} color="#f59e0b" />
                  <Text style={styles.gridRatingText}>{item.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
            <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.gridAuthor} numberOfLines={1}>{item.author}</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    if (viewMode === 'list') {
      return (
        <Animated.View entering={SlideInRight.delay(index * 40).duration(400)} style={styles.listCard}>
          <TouchableOpacity style={styles.listTouch} activeOpacity={0.9} onPress={() => openDetails(item)}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.listCover} resizeMode="cover" />
            ) : (
              <View style={[styles.placeholder, styles.listCover]}>
                <Text style={styles.placeholderText}>📚</Text>
              </View>
            )}
            <View style={styles.listContent}>
              <Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.listAuthor} numberOfLines={1}>{item.author}</Text>
              <View style={styles.listMeta}>
                {item.publishedDate && (
                  <View style={styles.metaTag}>
                    <Ionicons name="calendar-outline" size={10} color="#a78bfa" />
                    <Text style={styles.metaText}>{item.publishedDate.slice(0, 4)}</Text>
                  </View>
                )}
                {item.pageCount > 0 && (
                  <View style={styles.metaTag}>
                    <Ionicons name="document-outline" size={10} color="#a78bfa" />
                    <Text style={styles.metaText}>{item.pageCount}p</Text>
                  </View>
                )}
                {item.rating > 0 && (
                  <View style={styles.metaTag}>
                    <Ionicons name="star" size={10} color="#f59e0b" />
                    <Text style={styles.metaText}>{item.rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.listActions}>
              <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
                <Ionicons name={isFav ? "heart" : "heart-outline"} size={20} color={isFav ? "#ef4444" : "#888"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => addToLibrary(item)}>
                <Ionicons name="add-circle" size={20} color="#10b981" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    // Default card view
    return (
      <Animated.View entering={FadeInDown.delay(index * 80).duration(500)} layout={Layout.springify()} style={styles.cardWrapper}>
        <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={() => openDetails(item)}>
          <View style={styles.imageContainer}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.cover} resizeMode="cover" />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>No Image</Text>
              </View>
            )}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFillObject} />
            
            {/* Card action buttons */}
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.cardActionBtn} onPress={() => toggleFavorite(item.id)}>
                <Ionicons name={isFav ? "heart" : "heart-outline"} size={18} color={isFav ? "#ef4444" : "#fff"} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.cardActionBtn} onPress={() => toggleBookmark(item)}>
                <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={18} color={isBookmarked ? "#f59e0b" : "#fff"} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.cardActionBtn} onPress={() => shareBook(item)}>
                <Ionicons name="share-social-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Rating badge */}
            {item.rating > 0 && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#f59e0b" />
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              </View>
            )}

            {/* Meta tags */}
            <View style={styles.cardTags}>
              {item.publishedDate && (
                <View style={styles.cardTag}>
                  <Text style={styles.cardTagText}>{item.publishedDate.slice(0, 4)}</Text>
                </View>
              )}
              {item.pageCount > 0 && (
                <View style={styles.cardTag}>
                  <Text style={styles.cardTagText}>{item.pageCount}p</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.cardAuthor} numberOfLines={1}>{item.author}</Text>
            {item.categories?.length > 0 && (
              <Text style={styles.cardCategory} numberOfLines={1}>{item.categories[0]}</Text>
            )}
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={() => addToLibrary(item)}>
            <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.addBtnText}>Add to Library</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#2a0845', '#0f002b']} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <FlatList
          key={viewMode === 'grid' ? 'grid' : 'list'}
          data={getSortedRecommendations()}
          keyExtractor={(item, i) => item.id || `rec-${i}`}
          numColumns={viewMode === 'grid' ? 2 : 1}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" colors={['#8b5cf6']} />
          }
          ItemSeparatorComponent={() => <View style={{ height: viewMode === 'grid' ? 12 : 10 }} />}
          ListEmptyComponent={
            <Animated.View entering={FadeIn.duration(400)} style={styles.empty}>
              <Text style={styles.emptyEmoji}>📚</Text>
              <Text style={styles.emptyText}>No recommendations yet.</Text>
              <Text style={styles.emptySubtext}>Try exploring different genres or moods!</Text>
            </Animated.View>
          }
          ListHeaderComponent={() => (
            <View style={styles.container}>
              {/* Header */}
              <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
                <View style={styles.headerTop}>
                  <View>
                    <Text style={styles.title}>Discover</Text>
                    <Text style={styles.subtitle}>Find your next great read</Text>
                  </View>
                  <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => setShowBookmarksModal(true)}>
                      <Ionicons name="bookmark" size={20} color="#f59e0b" />
                      {bookmarked.length > 0 && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{bookmarked.length}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerBtn} onPress={pickRandomBook}>
                      <Ionicons name="shuffle" size={20} color="#a78bfa" />
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>

              {/* Daily Pick Card */}
              {dailyPick && (
                <Animated.View entering={FadeInUp.delay(200).duration(500)}>
                  <TouchableOpacity style={styles.dailyPick} onPress={() => { setSelected(dailyPick); setShowDailyPickModal(true); }}>
                    <LinearGradient colors={['#7c3aed', '#4f46e5']} style={styles.dailyPickGradient}>
                      <View style={styles.dailyPickContent}>
                        <Text style={styles.dailyPickLabel}>✨ Today's Pick</Text>
                        <Text style={styles.dailyPickTitle} numberOfLines={1}>{dailyPick.title}</Text>
                        <Text style={styles.dailyPickAuthor}>{dailyPick.author}</Text>
                      </View>
                      {dailyPick.image && (
                        <Image source={{ uri: dailyPick.image }} style={styles.dailyPickImage} resizeMode="cover" />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* Search Bar */}
              <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.searchContainer}>
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={18} color="#888" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search books, authors..."
                    placeholderTextColor="#666"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                  />
                  {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color="#888" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                {recentSearches.length > 0 && !searchQuery && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentSearches}>
                    {recentSearches.map((s, i) => (
                      <TouchableOpacity key={i} style={styles.recentTag} onPress={() => { setSearchQuery(s); handleSearch(); }}>
                        <Ionicons name="time-outline" size={12} color="#888" />
                        <Text style={styles.recentTagText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </Animated.View>

              {/* Category Tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'curated' && styles.tabActive]} 
                  onPress={loadCuratedPicks}
                >
                  <Text style={[styles.tabText, activeTab === 'curated' && styles.tabTextActive]}>✨ Curated</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'personalized' && styles.tabActive]} 
                  onPress={loadPersonalized}
                >
                  <Text style={[styles.tabText, activeTab === 'personalized' && styles.tabTextActive]}>🎯 For You</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'mood' && styles.tabActive]} 
                  onPress={() => setShowMoodModal(true)}
                >
                  <Text style={[styles.tabText, activeTab === 'mood' && styles.tabTextActive]}>🎭 By Mood</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'genre' && styles.tabActive]} 
                  onPress={() => setShowGenreModal(true)}
                >
                  <Text style={[styles.tabText, activeTab === 'genre' && styles.tabTextActive]}>📚 Genres</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tab} onPress={() => setShowTimePeriodModal(true)}>
                  <Text style={styles.tabText}>📅 Era</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Quick Genre Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genrePills}>
                {GENRES.slice(0, 6).map((genre) => (
                  <TouchableOpacity
                    key={genre.id}
                    style={[styles.genrePill, selectedGenre === genre.id && { backgroundColor: genre.color }]}
                    onPress={() => loadByGenre(genre.id)}
                  >
                    <Text style={styles.genrePillEmoji}>{genre.emoji}</Text>
                    <Text style={styles.genrePillText}>{genre.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Action Bar */}
              <View style={styles.actionBar}>
                <View style={styles.sortContainer}>
                  <TouchableOpacity 
                    style={styles.sortBtn} 
                    onPress={() => {
                      const sorts: Array<'relevance' | 'title' | 'author' | 'newest'> = ['relevance', 'title', 'author', 'newest'];
                      const idx = sorts.indexOf(sortBy);
                      setSortBy(sorts[(idx + 1) % sorts.length]);
                      Vibration.vibrate(30);
                    }}
                  >
                    <Ionicons name="swap-vertical" size={16} color="#a78bfa" />
                    <Text style={styles.sortText}>{sortBy}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.viewToggle}>
                  <TouchableOpacity 
                    style={[styles.viewBtn, viewMode === 'cards' && styles.viewBtnActive]} 
                    onPress={() => { setViewMode('cards'); Vibration.vibrate(30); }}
                  >
                    <Ionicons name="albums" size={16} color={viewMode === 'cards' ? '#fff' : '#666'} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]} 
                    onPress={() => { setViewMode('list'); Vibration.vibrate(30); }}
                  >
                    <Ionicons name="list" size={16} color={viewMode === 'list' ? '#fff' : '#666'} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]} 
                    onPress={() => { setViewMode('grid'); Vibration.vibrate(30); }}
                  >
                    <Ionicons name="grid" size={16} color={viewMode === 'grid' ? '#fff' : '#666'} />
                  </TouchableOpacity>
                </View>
              </View>

              {loading && (
                <Animated.View entering={FadeIn} style={styles.loader}>
                  <ActivityIndicator size="large" color="#8b5cf6" />
                  <Text style={styles.loaderText}>Finding great books...</Text>
                </Animated.View>
              )}

              {/* Trending Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>🔥 Trending Now</Text>
                  <TouchableOpacity onPress={loadTrendingBooks}>
                    <Ionicons name="refresh" size={18} color="#a78bfa" />
                  </TouchableOpacity>
                </View>
                <View style={{ position: 'relative' }}>
                  <TouchableOpacity
                    style={[styles.trendingArrow, { left: 6 }]}
                    onPress={() => {
                      const next = Math.max(0, trendingIndex - 1);
                      trendingRef.current?.scrollToOffset({ offset: next * TRENDING_ITEM_WIDTH, animated: true });
                      setTrendingIndex(next);
                    }}
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
                      setTrendingIndex(Math.round(x / TRENDING_ITEM_WIDTH));
                    }}
                    renderItem={({ item, index }) => (
                      <Animated.View entering={FadeInDown.delay(index * 80).duration(500)} style={styles.trendingCard}>
                        <TouchableOpacity activeOpacity={0.9} onPress={() => openDetails(item)} style={styles.trendingTouch}>
                          <View style={styles.trendingImageContainer}>
                            {item.image ? (
                              <Image source={{ uri: item.image }} style={styles.trendingCover} resizeMode="cover" />
                            ) : (
                              <View style={styles.placeholder}>
                                <Text style={styles.placeholderText}>📚</Text>
                              </View>
                            )}
                            <View style={styles.trendingRank}>
                              <Text style={styles.trendingRankText}>#{index + 1}</Text>
                            </View>
                          </View>
                          <View style={styles.trendingContent}>
                            <Text style={styles.trendingTitle} numberOfLines={2}>{item.title}</Text>
                            <Text style={styles.trendingAuthor} numberOfLines={1}>{item.author}</Text>
                            <TouchableOpacity style={styles.trendingAddBtn} onPress={() => addToLibrary(item)}>
                              <Ionicons name="add" size={14} color="#fff" />
                              <Text style={styles.trendingAddBtnText}>Add</Text>
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
                  >
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Results Header */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {activeTab === 'curated' ? '⭐ Curated Picks' : 
                     activeTab === 'personalized' ? '🎯 For You' :
                     activeTab === 'mood' ? `🎭 ${MOODS.find(m => m.id === selectedMood)?.name || 'Mood'} Reads` :
                     activeTab === 'genre' ? `📚 ${GENRES.find(g => g.id === selectedGenre)?.name || 'Genre'}` :
                     '📖 Recommendations'}
                  </Text>
                  <Text style={styles.resultCount}>{recommendations.length} books</Text>
                </View>
              </View>
            </View>
          )}
          renderItem={renderBookCard}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        />
      </KeyboardAvoidingView>

      {/* Mood Modal */}
      <Modal visible={showMoodModal} transparent animationType="fade">
        <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn.duration(300)} style={styles.moodModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How are you feeling?</Text>
              <TouchableOpacity onPress={() => setShowMoodModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Select a mood to find matching books</Text>
            <View style={styles.moodGrid}>
              {MOODS.map((mood) => (
                <TouchableOpacity
                  key={mood.id}
                  style={[styles.moodCard, selectedMood === mood.id && styles.moodCardActive]}
                  onPress={() => loadByMood(mood)}
                >
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  <Text style={styles.moodName}>{mood.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </BlurView>
      </Modal>

      {/* Genre Modal */}
      <Modal visible={showGenreModal} transparent animationType="fade">
        <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn.duration(300)} style={styles.genreModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Browse Genres</Text>
              <TouchableOpacity onPress={() => setShowGenreModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.genreList}>
              {GENRES.map((genre) => (
                <TouchableOpacity
                  key={genre.id}
                  style={[styles.genreItem, { borderLeftColor: genre.color }]}
                  onPress={() => loadByGenre(genre.id)}
                >
                  <Text style={styles.genreItemEmoji}>{genre.emoji}</Text>
                  <Text style={styles.genreItemName}>{genre.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#666" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </BlurView>
      </Modal>

      {/* Time Period Modal */}
      <Modal visible={showTimePeriodModal} transparent animationType="fade">
        <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn.duration(300)} style={styles.timePeriodModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Explore by Era</Text>
              <TouchableOpacity onPress={() => setShowTimePeriodModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            {TIME_PERIODS.map((period) => (
              <TouchableOpacity
                key={period.id}
                style={[styles.timePeriodCard, selectedTimePeriod === period.id && styles.timePeriodCardActive]}
                onPress={() => loadByTimePeriod(period)}
              >
                <Text style={styles.timePeriodEmoji}>{period.emoji}</Text>
                <View>
                  <Text style={styles.timePeriodName}>{period.name}</Text>
                  <Text style={styles.timePeriodYears}>{period.years}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </BlurView>
      </Modal>

      {/* Bookmarks Modal */}
      <Modal visible={showBookmarksModal} transparent animationType="slide">
        <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
          <View style={styles.bookmarksModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📌 Saved for Later</Text>
              <TouchableOpacity onPress={() => setShowBookmarksModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            {bookmarked.length === 0 ? (
              <View style={styles.emptyBookmarks}>
                <Text style={styles.emptyBookmarksEmoji}>📚</Text>
                <Text style={styles.emptyBookmarksText}>No bookmarks yet</Text>
                <Text style={styles.emptyBookmarksSubtext}>Tap the bookmark icon on any book to save it</Text>
              </View>
            ) : (
              <FlatList
                data={bookmarked}
                keyExtractor={(_, i) => `bookmark-${i}`}
                renderItem={({ item }) => (
                  <View style={styles.bookmarkItem}>
                    {item.image && <Image source={{ uri: item.image }} style={styles.bookmarkImage} />}
                    <View style={styles.bookmarkContent}>
                      <Text style={styles.bookmarkTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.bookmarkAuthor}>{item.author}</Text>
                    </View>
                    <View style={styles.bookmarkActions}>
                      <TouchableOpacity onPress={() => addToLibrary(item)}>
                        <Ionicons name="add-circle" size={24} color="#10b981" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => toggleBookmark(item)}>
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </BlurView>
      </Modal>

      {/* Daily Pick Modal */}
      <Modal visible={showDailyPickModal} transparent animationType="fade">
        <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn.duration(300)} style={styles.dailyPickModal}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowDailyPickModal(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            {dailyPick && (
              <>
                <Text style={styles.dailyPickModalLabel}>✨ Today's Recommendation</Text>
                {dailyPick.image && (
                  <Image source={{ uri: dailyPick.image }} style={styles.dailyPickModalImage} resizeMode="cover" />
                )}
                <Text style={styles.dailyPickModalTitle}>{dailyPick.title}</Text>
                <Text style={styles.dailyPickModalAuthor}>by {dailyPick.author}</Text>
                {dailyPick.description && (
                  <Text style={styles.dailyPickModalDesc} numberOfLines={4}>{dailyPick.description}</Text>
                )}
                <View style={styles.dailyPickModalActions}>
                  <TouchableOpacity style={styles.dailyPickModalBtn} onPress={() => { addToLibrary(dailyPick); setShowDailyPickModal(false); }}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.dailyPickModalBtnText}>Add to Library</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.dailyPickModalBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]} onPress={() => shareBook(dailyPick)}>
                    <Ionicons name="share-social" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        </BlurView>
      </Modal>

      <BookModal visible={modalVisible} onClose={closeDetails} book={selected} showAddToLibrary={true} addToLibrary={addToLibrary} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f002b' },
  container: { flex: 1, paddingHorizontal: 16 },
  
  // Header
  header: { marginTop: 16, marginBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#e0d0ff', letterSpacing: 0.5 },
  subtitle: { fontSize: 14, color: '#a78bfa', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { 
    width: 40, height: 40, borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  badge: { 
    position: 'absolute', top: -4, right: -4, 
    backgroundColor: '#ef4444', borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Daily Pick
  dailyPick: { marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  dailyPickGradient: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  dailyPickContent: { flex: 1 },
  dailyPickLabel: { color: '#fbbf24', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  dailyPickTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 2 },
  dailyPickAuthor: { color: '#c4b5fd', fontSize: 14 },
  dailyPickImage: { width: 60, height: 80, borderRadius: 8, marginLeft: 12 },

  // Search
  searchContainer: { marginBottom: 12 },
  searchBar: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  recentSearches: { marginTop: 8 },
  recentTag: { 
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)', 
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, marginRight: 8,
  },
  recentTagText: { color: '#888', fontSize: 12 },

  // Tabs
  tabsContainer: { marginBottom: 12, maxHeight: 40 },
  tab: { 
    paddingHorizontal: 14, paddingVertical: 8, 
    borderRadius: 20, marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tabActive: { backgroundColor: '#7c3aed' },
  tabText: { color: '#888', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  // Genre Pills
  genrePills: { marginBottom: 12, maxHeight: 36 },
  genrePill: { 
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)', 
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8,
  },
  genrePillEmoji: { fontSize: 14 },
  genrePillText: { color: '#e0d0ff', fontSize: 12, fontWeight: '600' },

  // Action Bar
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sortContainer: { flexDirection: 'row', alignItems: 'center' },
  sortBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)', 
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
  },
  sortText: { color: '#a78bfa', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  viewToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 3 },
  viewBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  viewBtnActive: { backgroundColor: '#7c3aed' },

  // Section
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#e0d0ff' },
  resultCount: { color: '#888', fontSize: 12 },

  // Loader
  loader: { alignItems: 'center', marginVertical: 20 },
  loaderText: { color: '#a78bfa', fontSize: 14, marginTop: 8 },

  // Trending
  trendingList: { paddingVertical: 8, paddingHorizontal: 4 },
  trendingCard: { width: 130, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1a0033' },
  trendingTouch: { flex: 1 },
  trendingImageContainer: { height: 180, backgroundColor: '#2d1b4e', position: 'relative' },
  trendingCover: { width: '100%', height: '100%' },
  trendingRank: { 
    position: 'absolute', top: 8, left: 8, 
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  trendingRankText: { color: '#fbbf24', fontSize: 11, fontWeight: '700' },
  trendingContent: { padding: 10 },
  trendingTitle: { fontSize: 13, fontWeight: '600', color: '#e0d0ff', marginBottom: 2 },
  trendingAuthor: { fontSize: 11, color: '#b794f4', marginBottom: 8 },
  trendingAddBtn: { 
    backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 6, borderRadius: 8, gap: 4,
  },
  trendingAddBtnText: { color: '#fff', fontWeight: '600', fontSize: 11 },
  trendingArrow: {
    position: 'absolute', top: '40%', zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 20,
  },

  // Card View
  list: { paddingBottom: 24 },
  cardWrapper: { borderRadius: 20, overflow: 'hidden', marginHorizontal: 16 },
  card: { backgroundColor: '#1a0033', borderRadius: 20, overflow: 'hidden' },
  imageContainer: { height: 180, position: 'relative' },
  cover: { width: '100%', height: '100%' },
  cardActions: { 
    position: 'absolute', top: 10, right: 10, 
    flexDirection: 'row', gap: 8,
  },
  cardActionBtn: { 
    width: 32, height: 32, borderRadius: 16, 
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  ratingBadge: { 
    position: 'absolute', top: 10, left: 10, 
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
  },
  ratingText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  cardTags: { position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', gap: 6 },
  cardTag: { backgroundColor: 'rgba(139,92,246,0.8)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  cardTagText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  content: { padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#e0d0ff', marginBottom: 4 },
  cardAuthor: { fontSize: 13, color: '#b794f4', marginBottom: 4 },
  cardCategory: { fontSize: 11, color: '#888' },
  addBtn: { 
    margin: 14, marginTop: 0, backgroundColor: '#10b981', 
    paddingVertical: 10, borderRadius: 12, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Grid View
  gridRow: { justifyContent: 'space-between', paddingHorizontal: 16 },
  gridCard: { width: (width - 48) / 2, marginBottom: 4 },
  gridImageContainer: { 
    height: 180, borderRadius: 12, overflow: 'hidden', 
    backgroundColor: '#2d1b4e', position: 'relative',
  },
  gridCover: { width: '100%', height: '100%' },
  gridOverlay: { position: 'absolute', top: 8, right: 8 },
  gridFavBtn: { 
    width: 28, height: 28, borderRadius: 14, 
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  gridRating: { 
    position: 'absolute', bottom: 8, left: 8, 
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  gridRatingText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  gridTitle: { fontSize: 13, fontWeight: '600', color: '#e0d0ff', marginTop: 8 },
  gridAuthor: { fontSize: 11, color: '#b794f4', marginTop: 2 },

  // List View
  listCard: { 
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, 
    marginHorizontal: 16, overflow: 'hidden',
  },
  listTouch: { flexDirection: 'row', padding: 10, alignItems: 'center' },
  listCover: { width: 50, height: 70, borderRadius: 8, backgroundColor: '#2d1b4e' },
  listContent: { flex: 1, marginLeft: 12 },
  listTitle: { fontSize: 14, fontWeight: '600', color: '#e0d0ff' },
  listAuthor: { fontSize: 12, color: '#b794f4', marginTop: 2 },
  listMeta: { flexDirection: 'row', marginTop: 6, gap: 8 },
  metaTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { color: '#888', fontSize: 10 },
  listActions: { flexDirection: 'column', gap: 8, marginLeft: 8 },

  // Empty State
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, color: '#a78bfa', fontWeight: '600', textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 6 },

  // Placeholder
  placeholder: { 
    width: '100%', height: '100%', 
    backgroundColor: '#2d1b4e', justifyContent: 'center', alignItems: 'center',
  },
  placeholderText: { color: '#666', fontSize: 24 },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    marginBottom: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  modalSubtitle: { color: '#888', fontSize: 13, marginBottom: 16 },
  closeModalBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10 },

  // Mood Modal
  moodModal: { 
    width: width * 0.9, backgroundColor: 'rgba(30,30,46,0.98)', 
    borderRadius: 24, padding: 20,
  },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  moodCard: { 
    width: (width * 0.9 - 64) / 3, aspectRatio: 1, 
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  moodCardActive: { backgroundColor: '#7c3aed' },
  moodEmoji: { fontSize: 28, marginBottom: 6 },
  moodName: { color: '#e0d0ff', fontSize: 11, fontWeight: '600' },

  // Genre Modal
  genreModal: { 
    width: width * 0.9, maxHeight: '70%', 
    backgroundColor: 'rgba(30,30,46,0.98)', borderRadius: 24, padding: 20,
  },
  genreList: { maxHeight: 400 },
  genreItem: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingVertical: 14, paddingHorizontal: 12, 
    borderLeftWidth: 3, marginBottom: 8, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  genreItemEmoji: { fontSize: 20, marginRight: 12 },
  genreItemName: { flex: 1, color: '#e0d0ff', fontSize: 15, fontWeight: '600' },

  // Time Period Modal
  timePeriodModal: { 
    width: width * 0.85, backgroundColor: 'rgba(30,30,46,0.98)', 
    borderRadius: 24, padding: 20,
  },
  timePeriodCard: { 
    flexDirection: 'row', alignItems: 'center', 
    padding: 16, marginTop: 12, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  timePeriodCardActive: { backgroundColor: '#7c3aed' },
  timePeriodEmoji: { fontSize: 32, marginRight: 16 },
  timePeriodName: { color: '#e0d0ff', fontSize: 16, fontWeight: '700' },
  timePeriodYears: { color: '#888', fontSize: 12, marginTop: 2 },

  // Bookmarks Modal
  bookmarksModal: { 
    width: width * 0.9, maxHeight: '70%', 
    backgroundColor: 'rgba(30,30,46,0.98)', borderRadius: 24, padding: 20,
  },
  emptyBookmarks: { alignItems: 'center', paddingVertical: 40 },
  emptyBookmarksEmoji: { fontSize: 48, marginBottom: 12 },
  emptyBookmarksText: { color: '#a78bfa', fontSize: 16, fontWeight: '600' },
  emptyBookmarksSubtext: { color: '#666', fontSize: 13, textAlign: 'center', marginTop: 6 },
  bookmarkItem: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  bookmarkImage: { width: 40, height: 60, borderRadius: 6 },
  bookmarkContent: { flex: 1, marginLeft: 12 },
  bookmarkTitle: { color: '#e0d0ff', fontSize: 14, fontWeight: '600' },
  bookmarkAuthor: { color: '#888', fontSize: 12, marginTop: 2 },
  bookmarkActions: { flexDirection: 'row', gap: 12 },

  // Daily Pick Modal
  dailyPickModal: { 
    width: width * 0.85, backgroundColor: 'rgba(30,30,46,0.98)', 
    borderRadius: 24, padding: 24, alignItems: 'center',
  },
  dailyPickModalLabel: { color: '#fbbf24', fontSize: 14, fontWeight: '600', marginBottom: 16, marginTop: 16 },
  dailyPickModalImage: { width: 140, height: 200, borderRadius: 12, marginBottom: 16 },
  dailyPickModalTitle: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  dailyPickModalAuthor: { color: '#a78bfa', fontSize: 14, marginTop: 4 },
  dailyPickModalDesc: { color: '#888', fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  dailyPickModalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  dailyPickModalBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#10b981', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
  },
  dailyPickModalBtnText: { color: '#fff', fontWeight: '600' },

  // Legacy styles kept for compatibility
  pillRow: { flexDirection: 'row', marginBottom: 20, gap: 10 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, overflow: 'hidden',
    minWidth: 120, alignItems: 'center',
  },
  pillText: { color: '#e0d0ff', fontWeight: '600', fontSize: 14 },
});