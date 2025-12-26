import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  Layout,
  SlideInRight,
  ZoomIn
} from 'react-native-reanimated';
import BookModal from '../../components/BookModal';
import { supabase } from '../../supabase';

type Book = {
  id?: string;
  title?: string;
  author?: string;
  description?: string;
  user_id?: string;
  category_id?: string;
  status?: string;
  image?: string;
  info?: any;
  publishedDate?: string;
  pageCount?: number;
  averageRating?: number;
  ratingsCount?: number;
  previewLink?: string;
  language?: string;
  publisher?: string;
};

type ViewMode = 'grid' | 'list';
type SortOption = 'relevance' | 'newest' | 'title' | 'rating';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = [
  'History', 'Biographies', 'Science', 'Technology', 'Philosophy', 'Psychology', 'Business', 'Self-Help',
  'Art', 'Photography', 'Travel', 'Cooking', 'Health', 'Politics', 'Religion', 'Poetry',
  'Fantasy', 'Science Fiction', 'Mystery', 'Thriller', 'Romance', 'Young Adult', 'Children',
  'Graphic Novels', 'Comics', 'Drama', 'Humor', 'Music', 'Nature', 'Environment', 'Sports',
  'Education', 'Reference', 'Law', 'Medical', 'Economics', 'Sociology', 'Anthropology', 'Culture',
  'History of Science', 'Classics', 'Mythology', 'Religion & Spirituality', 'True Crime', 'Design'
];

const TRENDING_SEARCHES = [
  '📚 Best sellers 2024',
  '🔥 New releases',
  '⭐ Award winners',
  '🎭 Classic literature',
  '🧠 Self improvement',
  '💼 Business strategy',
];

const QUICK_FILTERS = [
  { label: '🆕 New', query: 'new releases 2024' },
  { label: '⭐ Top Rated', query: 'best rated books' },
  { label: '📖 Free', query: 'free ebooks' },
  { label: '🎧 Audio', query: 'audiobooks' },
];

export default function DiscoverScreen() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
  const filteredCategoriesForDropdown = categoryQuery.trim()
    ? CATEGORIES.filter(c => c.toLowerCase().includes(categoryQuery.trim().toLowerCase()))
    : CATEGORIES;
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [addingBookId, setAddingBookId] = useState<string | null>(null);

  // New feature states
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortOption, setSortOption] = useState<SortOption>('relevance');
  const [showSortModal, setShowSortModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [filters, setFilters] = useState({
    language: 'all',
    hasPreview: false,
    minRating: 0,
  });
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

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
        // Load search history from storage
        loadSearchHistory(session.user.id);
        loadFavorites(session.user.id);
      } catch (err: any) {
      }
    };
    init();
  }, []);

  const loadSearchHistory = async (uid: string) => {
    try {
      const { data } = await supabase
        .from('search_history')
        .select('query')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) {
        setSearchHistory(data.map(d => d.query));
      }
    } catch (e) {
      // Table might not exist yet
    }
  };

  const saveSearchHistory = async (searchQuery: string) => {
    if (!userId || !searchQuery.trim()) return;
    try {
      // Update local state
      setSearchHistory(prev => {
        const filtered = prev.filter(q => q !== searchQuery);
        return [searchQuery, ...filtered].slice(0, 10);
      });
      // Try to save to database (table might not exist)
      await supabase.from('search_history').upsert({
        user_id: userId,
        query: searchQuery,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      // Ignore if table doesn't exist
    }
  };

  const loadFavorites = async (uid: string) => {
    try {
      const { data } = await supabase
        .from('favorites')
        .select('book_id')
        .eq('user_id', uid);
      if (data) {
        setFavorites(new Set(data.map(d => d.book_id)));
      }
    } catch (e) {}
  };

  const toggleFavorite = async (bookId: string) => {
    if (!userId) return;
    Vibration.vibrate(50);
    
    const newFavorites = new Set(favorites);
    if (newFavorites.has(bookId)) {
      newFavorites.delete(bookId);
      try {
        await supabase.from('favorites').delete()
          .eq('user_id', userId)
          .eq('book_id', bookId);
      } catch (e) {}
    } else {
      newFavorites.add(bookId);
    }
    setFavorites(newFavorites);
  };

  const shareBook = async (book: any) => {
    try {
      await Share.share({
        title: book.title,
        message: `Check out "${book.title}" by ${book.author}! ${book.info?.previewLink || ''}`,
      });
    } catch (e) {}
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setSelectedCategory(null);
    setCurrentPage(0);
    setTotalResults(0);
  };

  const parseBookData = (item: any) => ({
    title: item.volumeInfo.title,
    author: item.volumeInfo.authors?.[0] ?? 'Unknown',
    description: item.volumeInfo.description || item.volumeInfo.subtitle || '',
    image: item.volumeInfo.imageLinks?.thumbnail ||
           item.volumeInfo.imageLinks?.smallThumbnail ||
           item.volumeInfo.imageLinks?.small || null,
    info: item.volumeInfo,
    publishedDate: item.volumeInfo.publishedDate,
    pageCount: item.volumeInfo.pageCount,
    averageRating: item.volumeInfo.averageRating,
    ratingsCount: item.volumeInfo.ratingsCount,
    previewLink: item.volumeInfo.previewLink,
    language: item.volumeInfo.language,
    publisher: item.volumeInfo.publisher,
    googleId: item.id,
  });

  const sortResults = useCallback((books: any[]) => {
    switch (sortOption) {
      case 'newest':
        return [...books].sort((a, b) => {
          const dateA = new Date(a.publishedDate || '1900').getTime();
          const dateB = new Date(b.publishedDate || '1900').getTime();
          return dateB - dateA;
        });
      case 'title':
        return [...books].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'rating':
        return [...books].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
      default:
        return books;
    }
  }, [sortOption]);

  const filterResults = useCallback((books: any[]) => {
    return books.filter(book => {
      if (filters.language !== 'all' && book.language !== filters.language) return false;
      if (filters.hasPreview && !book.previewLink) return false;
      if (filters.minRating > 0 && (book.averageRating || 0) < filters.minRating) return false;
      return true;
    });
  }, [filters]);

  const displayedResults = useMemo(() => {
    return sortResults(filterResults(results));
  }, [results, sortResults, filterResults]);

  const searchGoogleBooks = async (searchQuery?: string, append = false) => {
    const q = searchQuery || query;
    // If the user is explicitly searching by text, clear any selected category
    // to avoid conflicts between a category filter and a free-text query.
    if (selectedCategory && !searchQuery) {
      setSelectedCategory(null);
      setCategoryQuery('');
    }
    if (!q.trim()) return;
    
    if (!append) {
      setCurrentPage(0);
      setResults([]);
    }
    
    setHasSearched(true);
    append ? setLoadingMore(true) : setLoading(true);
    setShowQuickActions(false);
    
    try {
      const startIndex = append ? (currentPage + 1) * 20 : 0;
      const resp = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=20&startIndex=${startIndex}`
      );
      const data = await resp.json();
      
      setTotalResults(data.totalItems || 0);
      const newBooks = (data.items || []).map(parseBookData);
      
      if (append) {
        setResults(prev => [...prev, ...newBooks]);
        setCurrentPage(prev => prev + 1);
      } else {
        setResults(newBooks);
        saveSearchHistory(q);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to search Google Books');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreResults = () => {
    if (loadingMore || results.length >= totalResults) return;
    searchGoogleBooks(query, true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedCategory) {
      await fetchCategory(selectedCategory);
    } else if (query) {
      await searchGoogleBooks();
    }
    setRefreshing(false);
  };

  const quickSearch = (searchQuery: string) => {
    setQuery(searchQuery.replace(/^[^\w\s]+\s*/, '')); // Remove emoji prefix
    searchGoogleBooks(searchQuery.replace(/^[^\w\s]+\s*/, ''));
  };

  const fetchCategory = async (category: string) => {
    setHasSearched(true);
    setLoading(true);
    setResults([]);
    setShowQuickActions(false);
    try {
      const resp = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(
          category
        )}&maxResults=20`
      );
      const data = await resp.json();
      setTotalResults(data.totalItems || 0);
      setResults((data.items || []).map(parseBookData));
      setSelectedCategory(category);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to fetch category books');
    } finally {
      setLoading(false);
    }
  };

  const addToLibrary = async (book: Book) => {
    if (!userId) {
      router.replace('/auth');
      return;
    }
    
    // Prevent duplicate submissions by checking if already adding this book
    const bookKey = `${book.title}-${book.author || 'Unknown'}`;
    if (addingBookId === bookKey) {
      return;
    }
    
    setAddingBookId(bookKey);
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
        setAddingBookId(null);
        return;
      }

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
        }
      }

      if ((book as any).image) {
        payload.image = (book as any).image;
        payload.cover_image = (book as any).image;
      }

      let res = await supabase
        .from('books')
        .insert([payload])
        .select('*')
        .single();

      if (res.error) {
        const retry = await supabase
          .from('books')
          .insert([
            {
              title: book.title,
              author: book.author || 'Unknown',
              description: book.description || '',
              user_id: userId,
              status: 'already read',
              image: (book as any).image || null,
              cover_image: (book as any).image || null,
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
      setAddingBookId(null);
    }
  };

  const openDetails = (b: any) => {
    setSelectedBook(b);
    setModalVisible(true);
    // Add to recently viewed
    setRecentlyViewed(prev => {
      const filtered = prev.filter(book => book.title !== b.title);
      return [b, ...filtered].slice(0, 5);
    });
  };
  const closeDetails = () => {
    setSelectedBook(null);
    setModalVisible(false);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={{ color: i <= rating ? '#fbbf24' : '#4a4a4a', fontSize: 12 }}>
          ★
        </Text>
      );
    }
    return <View style={{ flexDirection: 'row' }}>{stars}</View>;
  };

  const renderGridItem = ({ item, index }: { item: any; index: number }) => (
    <Animated.View
      entering={ZoomIn.delay(index * 50).duration(300)}
      style={styles.gridItem}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.gridCard}
        onPress={() => openDetails(item)}
        onLongPress={() => {
          Vibration.vibrate(50);
          Alert.alert(
            item.title,
            'Quick Actions',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Share', onPress: () => shareBook(item) },
              { text: 'Add to Library', onPress: () => addToLibrary(item) },
            ]
          );
        }}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.gridImage} resizeMode="cover" />
        ) : (
          <View style={[styles.gridImage, styles.placeholderCover]}>
            <Text style={styles.placeholderText}>📚</Text>
          </View>
        )}
        {item.averageRating && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>⭐ {item.averageRating.toFixed(1)}</Text>
          </View>
        )}
        <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.gridAuthor} numberOfLines={1}>{item.author}</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderListItem = ({ item, index }: { item: any; index: number }) => {
    const bookId = `${item.title}-${item.author || 'Unknown'}`;
    const isFavorite = favorites.has(item.googleId || bookId);
    
    return (
      <Animated.View
        entering={FadeInDown.delay(index * 80).duration(500)}
        layout={Layout.springify()}
        style={styles.cardWrapper}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.card}
          onPress={() => openDetails(item)}
          onLongPress={() => {
            Vibration.vibrate(50);
            Alert.alert(
              item.title,
              'Quick Actions',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Share', onPress: () => shareBook(item) },
                { text: isFavorite ? 'Remove from Favorites' : 'Add to Favorites', 
                  onPress: () => toggleFavorite(item.googleId || bookId) },
                { text: 'Add to Library', onPress: () => addToLibrary(item) },
              ]
            );
          }}
        >
          <View style={styles.imageContainer}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.cover} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderCover}>
                <Text style={styles.placeholderText}>No Image</Text>
              </View>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.6)']}
              style={StyleSheet.absoluteFillObject}
            />
            
            {/* Favorite Button */}
            <TouchableOpacity
              style={styles.favoriteBtn}
              onPress={() => toggleFavorite(item.googleId || bookId)}
            >
              <Text style={{ fontSize: 20 }}>{isFavorite ? '❤️' : '🤍'}</Text>
            </TouchableOpacity>

            {/* Share Button */}
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={() => shareBook(item)}
            >
              <Text style={{ fontSize: 18 }}>📤</Text>
            </TouchableOpacity>

            {/* Rating Badge */}
            {item.averageRating && (
              <View style={styles.cardRatingBadge}>
                {renderStars(Math.round(item.averageRating))}
                <Text style={styles.cardRatingText}>
                  {item.averageRating.toFixed(1)} ({item.ratingsCount || 0})
                </Text>
              </View>
            )}
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.cardAuthor} numberOfLines={1}>{item.author}</Text>
            
            {/* Book Meta Info */}
            <View style={styles.metaRow}>
              {item.publishedDate && (
                <View style={styles.metaTag}>
                  <Text style={styles.metaText}>📅 {item.publishedDate.split('-')[0]}</Text>
                </View>
              )}
              {item.pageCount && (
                <View style={styles.metaTag}>
                  <Text style={styles.metaText}>📄 {item.pageCount} pages</Text>
                </View>
              )}
              {item.language && (
                <View style={styles.metaTag}>
                  <Text style={styles.metaText}>🌐 {item.language.toUpperCase()}</Text>
                </View>
              )}
            </View>

            {item.description ? (
              <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text>
            ) : null}

            {item.info?.categories && (
              <View style={styles.categoryTags}>
                {item.info.categories.slice(0, 2).map((cat: string, i: number) => (
                  <View key={i} style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{cat}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.cardActions}>
            {item.previewLink && (
              <TouchableOpacity style={styles.previewBtn}>
                <Text style={styles.previewBtnText}>👁 Preview</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.addBtn, addingBookId === bookId && styles.addBtnDisabled]}
              onPress={() => addToLibrary(item)}
              disabled={addingBookId === bookId}
            >
              {addingBookId === bookId ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.addBtnText}>+ Add to Library</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
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
        <View style={styles.container}>
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.title}>Discover Books</Text>
                <Text style={styles.subtitle}>
                  Find your next favorite read
                </Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity 
                  style={styles.headerBtn}
                  onPress={() => setShowHistoryModal(true)}
                >
                  <Text style={styles.headerBtnText}>🕐</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.headerBtn}
                  onPress={() => setShowFiltersModal(true)}
                >
                  <Text style={styles.headerBtnText}>⚙️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Search Row */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            style={styles.searchRow}
          >
            <View style={styles.inputContainer}>
              {Platform.OS !== 'web' && (
                <BlurView 
                  intensity={80} 
                  tint="dark" 
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                />
              )}
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.input}
                placeholder="Search titles, authors, ISBN..."
                placeholderTextColor="#aaa"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => searchGoogleBooks()}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />

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

            <TouchableOpacity
              style={[styles.actionBtn, styles.searchBtn]}
              onPress={() => searchGoogleBooks()}
              disabled={loading}
            >
              <Text style={styles.actionBtnText}>Search</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Quick Filters */}
          {showQuickActions && !hasSearched && (
            <Animated.View entering={FadeInUp.delay(300).duration(500)}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickFiltersRow}
              >
                {QUICK_FILTERS.map((filter, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.quickFilterBtn}
                    onPress={() => quickSearch(filter.query)}
                  >
                    <Text style={styles.quickFilterText}>{filter.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Trending Searches */}
              <View style={styles.trendingSection}>
                <Text style={styles.sectionTitle}>🔥 Trending Searches</Text>
                <View style={styles.trendingGrid}>
                  {TRENDING_SEARCHES.map((trend, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.trendingItem}
                      onPress={() => quickSearch(trend)}
                    >
                      <Text style={styles.trendingText}>{trend}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Recently Viewed */}
              {recentlyViewed.length > 0 && (
                <View style={styles.recentSection}>
                  <Text style={styles.sectionTitle}>👁 Recently Viewed</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {recentlyViewed.map((book, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.recentCard}
                        onPress={() => openDetails(book)}
                      >
                        {book.image ? (
                          <Image source={{ uri: book.image }} style={styles.recentImage} />
                        ) : (
                          <View style={[styles.recentImage, styles.placeholderCover]}>
                            <Text>📚</Text>
                          </View>
                        )}
                        <Text style={styles.recentTitle} numberOfLines={1}>{book.title}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </Animated.View>
          )}

          {/* Results Header */}
          {hasSearched && !loading && (
            <Animated.View entering={FadeIn} style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {totalResults > 0 ? `${totalResults.toLocaleString()} results` : 'No results'}
                {selectedCategory && ` in "${selectedCategory}"`}
              </Text>
              <View style={styles.viewControls}>
                <TouchableOpacity
                  style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
                  onPress={() => setViewMode('list')}
                >
                  <Text style={styles.viewBtnText}>☰</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
                  onPress={() => setViewMode('grid')}
                >
                  <Text style={styles.viewBtnText}>⊞</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sortBtn}
                  onPress={() => setShowSortModal(true)}
                >
                  <Text style={styles.sortBtnText}>↕️ Sort</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {loading && (
            <Animated.View entering={FadeIn} style={styles.loader}>
              <ActivityIndicator size="large" color="#8b5cf6" />
              <Text style={styles.loadingText}>Searching books...</Text>
            </Animated.View>
          )}

          {/* Category Selector */}
          <View style={styles.categoryContainer}>
            <TextInput
              placeholder="🏷 Browse by category..."
              placeholderTextColor="#bdbdbd"
              value={categoryQuery}
              onChangeText={(t) => {
                setCategoryQuery(t);
                setCategoryDropdownVisible(true);
              }}
              onFocus={() => setCategoryDropdownVisible(true)}
              onBlur={() => {
                setTimeout(() => setCategoryDropdownVisible(false), 200);
              }}
              style={styles.categoryInput}
            />
            {(categoryQuery.length > 0 || selectedCategory) && (
              <TouchableOpacity
                style={styles.categoryClearBtn}
                onPress={() => {
                  setCategoryQuery('');
                  setSelectedCategory(null);
                  setCategoryDropdownVisible(false);
                  setResults([]);
                  setHasSearched(false);
                  setShowQuickActions(true);
                }}
              >
                <Text style={{ color: '#fff' }}>×</Text>
              </TouchableOpacity>
            )}

            {categoryDropdownVisible && (
              <View style={styles.dropdown}>
                {filteredCategoriesForDropdown.length === 0 ? (
                  <Text style={styles.dropdownItemText}>No categories</Text>
                ) : (
                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator style={{ maxHeight: 220 }}>
                    <TouchableOpacity
                      key="__all__"
                      onPress={() => {
                        setSelectedCategory(null);
                        setCategoryQuery('');
                        setQuery('');
                        setResults([]);
                        setHasSearched(false);
                        setCategoryDropdownVisible(false);
                        setShowQuickActions(true);
                      }}
                      style={styles.dropdownItem}
                    >
                      <Text style={styles.dropdownItemText}>📚 All Categories</Text>
                    </TouchableOpacity>

                    {filteredCategoriesForDropdown.map(cat => {
                      const isSelected = selectedCategory === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => {
                            if (isSelected) {
                                setSelectedCategory(null);
                                setCategoryQuery('');
                                setQuery('');
                                setResults([]);
                                setHasSearched(false);
                                setCategoryDropdownVisible(false);
                                setShowQuickActions(true);
                            } else {
                                setQuery('');
                                setCategoryQuery(cat);
                                setCategoryDropdownVisible(false);
                                fetchCategory(cat);
                            }
                          }}
                          style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                        >
                          <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>{cat}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}
          </View>

          {/* Results List */}
          <FlatList
            key={viewMode}
            data={displayedResults}
            keyExtractor={(item, i) => `book-${item.googleId || i}`}
            numColumns={viewMode === 'grid' ? 2 : 1}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: viewMode === 'grid' ? 0 : 12 }} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#8b5cf6"
                colors={['#8b5cf6']}
              />
            }
            onEndReached={loadMoreResults}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color="#8b5cf6" />
                  <Text style={styles.loadingMoreText}>Loading more...</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              !loading ? (
                <Animated.View entering={FadeIn.duration(400)} style={styles.empty}>
                  <Text style={styles.emptyIcon}>{!hasSearched ? '📚' : '🔍'}</Text>
                  <Text style={styles.emptyText}>
                    {!hasSearched
                      ? 'Start searching for books to discover new titles!'
                      : 'No results found. Try different keywords.'}
                  </Text>
                </Animated.View>
              ) : null
            }
            renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Sort Modal */}
      <Modal visible={showSortModal} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <Animated.View entering={ZoomIn} style={styles.sortModal}>
            <Text style={styles.modalTitle}>Sort By</Text>
            {[
              { key: 'relevance', label: '🎯 Relevance' },
              { key: 'newest', label: '📅 Newest First' },
              { key: 'title', label: '🔤 Title A-Z' },
              { key: 'rating', label: '⭐ Highest Rated' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.sortOption, sortOption === option.key && styles.sortOptionActive]}
                onPress={() => {
                  setSortOption(option.key as SortOption);
                  setShowSortModal(false);
                }}
              >
                <Text style={[styles.sortOptionText, sortOption === option.key && styles.sortOptionTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Search History Modal */}
      <Modal visible={showHistoryModal} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowHistoryModal(false)}
        >
          <Animated.View entering={SlideInRight} style={styles.historyModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🕐 Search History</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Text style={styles.closeModalText}>×</Text>
              </TouchableOpacity>
            </View>
            {searchHistory.length === 0 ? (
              <Text style={styles.emptyHistoryText}>No search history yet</Text>
            ) : (
              <ScrollView>
                {searchHistory.map((h, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.historyItem}
                    onPress={() => {
                      setQuery(h);
                      setShowHistoryModal(false);
                      searchGoogleBooks(h);
                    }}
                  >
                    <Text style={styles.historyIcon}>🔍</Text>
                    <Text style={styles.historyText}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Filters Modal */}
      <Modal visible={showFiltersModal} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowFiltersModal(false)}
        >
          <Animated.View entering={FadeInUp} style={styles.filtersModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚙️ Filters</Text>
              <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
                <Text style={styles.closeModalText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Language</Text>
              <View style={styles.filterOptions}>
                {['all', 'en', 'es', 'fr', 'de'].map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[styles.filterOption, filters.language === lang && styles.filterOptionActive]}
                    onPress={() => setFilters(f => ({ ...f, language: lang }))}
                  >
                    <Text style={[styles.filterOptionText, filters.language === lang && styles.filterOptionTextActive]}>
                      {lang === 'all' ? 'All' : lang.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Minimum Rating</Text>
              <View style={styles.filterOptions}>
                {[0, 3, 4, 5].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[styles.filterOption, filters.minRating === rating && styles.filterOptionActive]}
                    onPress={() => setFilters(f => ({ ...f, minRating: rating }))}
                  >
                    <Text style={[styles.filterOptionText, filters.minRating === rating && styles.filterOptionTextActive]}>
                      {rating === 0 ? 'Any' : `${rating}+ ⭐`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.applyFiltersBtn}
              onPress={() => setShowFiltersModal(false)}
            >
              <Text style={styles.applyFiltersBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <BookModal
        visible={modalVisible}
        onClose={closeDetails}
        addToLibrary={addToLibrary}
        book={selectedBook}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f002b' },
  container: { flex: 1, paddingHorizontal: 16 },

  header: { marginTop: 16, marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#e0d0ff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#c0a9ff',
    marginTop: 2,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnText: { fontSize: 18 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  searchIcon: { fontSize: 16, marginLeft: 14 },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 10,
    paddingRight: 40, 
    fontSize: 15,
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
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtn: { backgroundColor: '#8b5cf6' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Quick Filters
  quickFiltersRow: { paddingVertical: 8, gap: 8 },
  quickFilterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  quickFilterText: { color: '#e9d5ff', fontWeight: '600', fontSize: 13 },

  // Trending Section
  trendingSection: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#e0d0ff', marginBottom: 12 },
  trendingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trendingItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
  },
  trendingText: { color: '#c0a9ff', fontSize: 13 },

  // Recently Viewed
  recentSection: { marginTop: 20 },
  recentCard: { 
    width: 100, 
    marginRight: 12,
    alignItems: 'center',
  },
  recentImage: { 
    width: 80, 
    height: 110, 
    borderRadius: 8, 
    marginBottom: 6 
  },
  recentTitle: { color: '#e0d0ff', fontSize: 11, textAlign: 'center' },

  // Results Header
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  resultsCount: { color: '#a78bfa', fontSize: 13 },
  viewControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  viewBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewBtnActive: { backgroundColor: '#8b5cf6' },
  viewBtnText: { fontSize: 16 },
  sortBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    marginLeft: 4,
  },
  sortBtnText: { color: '#e9d5ff', fontSize: 12 },

  loader: { alignItems: 'center', marginVertical: 20 },
  loadingText: { color: '#a78bfa', marginTop: 8, fontSize: 14 },
  loadingMore: { alignItems: 'center', paddingVertical: 16 },
  loadingMoreText: { color: '#a78bfa', marginTop: 4, fontSize: 12 },

  // Grid View
  gridItem: { 
    width: (SCREEN_WIDTH - 48) / 2, 
    marginBottom: 12,
    marginHorizontal: 4,
  },
  gridCard: {
    backgroundColor: '#1a0033',
    borderRadius: 14,
    overflow: 'hidden',
    padding: 10,
  },
  gridImage: { width: '100%', height: 140, borderRadius: 10, marginBottom: 8 },
  gridTitle: { color: '#e0d0ff', fontWeight: '600', fontSize: 13, marginBottom: 2 },
  gridAuthor: { color: '#b794f4', fontSize: 11 },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ratingText: { color: '#fbbf24', fontSize: 11, fontWeight: '600' },

  // List View
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

  favoriteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtn: {
    position: 'absolute',
    top: 10,
    right: 52,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardRatingBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  cardRatingText: { color: '#fbbf24', fontSize: 11 },

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
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  metaTag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderRadius: 6,
  },
  metaText: { color: '#c0a9ff', fontSize: 11 },
  cardDesc: {
    fontSize: 13,
    color: '#b8a0ff',
    lineHeight: 18,
    marginBottom: 8,
  },
  categoryTags: { flexDirection: 'row', gap: 6, marginTop: 4 },
  categoryTag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 12,
  },
  categoryTagText: { color: '#6ee7b7', fontSize: 11 },

  cardActions: { flexDirection: 'row', padding: 12, paddingTop: 0, gap: 8 },
  previewBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    alignItems: 'center',
  },
  previewBtnText: { color: '#e9d5ff', fontWeight: '500', fontSize: 13 },
  addBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: '#10b98166',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },

  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 15, color: '#a78bfa', textAlign: 'center', lineHeight: 22 },

  // Category Dropdown
  categoryContainer: { marginVertical: 8, position: 'relative', zIndex: 50 },
  categoryInput: { backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, color: '#fff' },
  categoryClearBtn: { position: 'absolute', right: 12, top: 10, padding: 6 },
  dropdown: { position: 'absolute', top: 48, left: 0, right: 0, backgroundColor: '#140022', borderRadius: 10, maxHeight: 220, zIndex: 100, paddingVertical: 6 },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 12 },
  dropdownItemSelected: { backgroundColor: 'rgba(139,92,246,0.15)' },
  dropdownItemText: { color: '#e9d5ff' },
  dropdownItemTextSelected: { color: '#fff', fontWeight: '700' },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModal: {
    width: '80%',
    backgroundColor: '#1a0033',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#e0d0ff', marginBottom: 16 },
  sortOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sortOptionActive: { backgroundColor: '#8b5cf6' },
  sortOptionText: { color: '#c0a9ff', fontSize: 15 },
  sortOptionTextActive: { color: '#fff', fontWeight: '600' },

  historyModal: {
    width: '85%',
    maxHeight: '60%',
    backgroundColor: '#1a0033',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeModalText: { fontSize: 28, color: '#a78bfa' },
  emptyHistoryText: { color: '#a78bfa', textAlign: 'center', paddingVertical: 20 },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  historyIcon: { fontSize: 16, marginRight: 12 },
  historyText: { color: '#e0d0ff', fontSize: 14 },

  filtersModal: {
    width: '90%',
    backgroundColor: '#1a0033',
    borderRadius: 20,
    padding: 20,
  },
  filterGroup: { marginBottom: 20 },
  filterLabel: { color: '#e0d0ff', fontWeight: '600', marginBottom: 10 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
  },
  filterOptionActive: { backgroundColor: '#8b5cf6' },
  filterOptionText: { color: '#c0a9ff', fontSize: 13 },
  filterOptionTextActive: { color: '#fff', fontWeight: '600' },
  applyFiltersBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  applyFiltersBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  categoriesRow: { paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, marginHorizontal: 6 },
  chipSelected: { backgroundColor: '#8b5cf6' },
  chipText: { color: '#e9d5ff', fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
  removeBtn: { marginRight: 8, backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  removeBtnText: { color: '#ffd1d1', fontWeight: '700' },
});