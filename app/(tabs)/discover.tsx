import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  Layout,
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
};

const CATEGORIES = [
  'History', 'Biographies', 'Science', 'Technology', 'Philosophy', 'Psychology', 'Business', 'Self-Help',
  'Art', 'Photography', 'Travel', 'Cooking', 'Health', 'Politics', 'Religion', 'Poetry',
  'Fantasy', 'Science Fiction', 'Mystery', 'Thriller', 'Romance', 'Young Adult', 'Children',
  'Graphic Novels', 'Comics', 'Drama', 'Humor', 'Music', 'Nature', 'Environment', 'Sports',
  'Education', 'Reference', 'Law', 'Medical', 'Economics', 'Sociology', 'Anthropology', 'Culture',
  'History of Science', 'Classics', 'Mythology', 'Religion & Spirituality', 'True Crime', 'Design'
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
      }
    };
    init();
  }, []);

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setSelectedCategory(null);
  };

  const searchGoogleBooks = async () => {
    // If the user is explicitly searching by text, clear any selected category
    // to avoid conflicts between a category filter and a free-text query.
    if (selectedCategory) {
      setSelectedCategory(null);
      setCategoryQuery('');
    }
    if (!query.trim()) return;
    setHasSearched(true);
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

  const fetchCategory = async (category: string) => {
    setHasSearched(true);
    setLoading(true);
    setResults([]);
    try {
      const Resp = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(
          category
        )}&maxResults=20`
      );
      const data = await Resp.json();
      setResults(
        (data.items || []).map((it: any) => ({
          title: it.volumeInfo.title,
          author: it.volumeInfo.authors?.[0] ?? 'Unknown',
          description: it.volumeInfo.description || it.volumeInfo.subtitle || '',
          image:
            it.volumeInfo.imageLinks?.thumbnail ||
            it.volumeInfo.imageLinks?.smallThumbnail ||
            it.volumeInfo.imageLinks?.small ||
            null,
          info: it.volumeInfo,
        }))
      );
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
  };
  const closeDetails = () => {
    setSelectedBook(null);
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
        <View style={styles.container}>
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <Text style={styles.title}>Discover Books</Text>
            <Text style={styles.subtitle}>
              Search Google Books and add gems to your personal library.
            </Text>
          </Animated.View>

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

              <TextInput
                style={styles.input}
                placeholder="Search titles or authors..."
                placeholderTextColor="#aaa"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={searchGoogleBooks}
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
              onPress={searchGoogleBooks}
              disabled={loading}
            >
              <Text style={styles.actionBtnText}>Search</Text>
            </TouchableOpacity>
          </Animated.View>

          {loading && (
            <Animated.View entering={FadeIn} style={styles.loader}>
              <ActivityIndicator size="large" color="#8b5cf6" />
            </Animated.View>
          )}

          <View style={styles.categoryContainer}>
            <TextInput
              placeholder="Select category (search...)"
              placeholderTextColor="#bdbdbd"
              value={categoryQuery}
              onChangeText={(t) => {
                setCategoryQuery(t);
                setCategoryDropdownVisible(true);
              }}
              onFocus={() => setCategoryDropdownVisible(true)}
              onBlur={() => {
                // Delay hiding dropdown to allow item selection
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
                        // Clear any category selection and also reset the text input
                        // to avoid a conflicting dual search state.
                        setSelectedCategory(null);
                        setCategoryQuery('');
                        setQuery('');
                        setResults([]);
                        setHasSearched(false);
                        setCategoryDropdownVisible(false);
                      }}
                      style={styles.dropdownItem}
                    >
                      <Text style={styles.dropdownItemText}>All</Text>
                    </TouchableOpacity>

                    {filteredCategoriesForDropdown.map(cat => {
                      const isSelected = selectedCategory === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => {
                            if (isSelected) {
                                // Deselecting a category: clear category state and the text input
                                setSelectedCategory(null);
                                setCategoryQuery('');
                                setQuery('');
                                setResults([]);
                                setHasSearched(false);
                                setCategoryDropdownVisible(false);
                            } else {
                                // Selecting a category should clear the text input to avoid
                                // conflicting searches and then fetch the category results.
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

          <FlatList
            data={results}
            keyExtractor={(_, i) => `book-${i}`}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListEmptyComponent={
              <Animated.View entering={FadeIn.duration(400)} style={styles.empty}>
                  <Text style={styles.emptyText}>
                    {!hasSearched
                      ? 'Start searching for books to discover new titles!'
                      : 'No results found.'}
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

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <TouchableOpacity
                      style={[styles.addBtn, addingBookId === `${item.title}-${item.author || 'Unknown'}` && styles.addBtnDisabled]}
                      onPress={() => addToLibrary(item)}
                      disabled={addingBookId === `${item.title}-${item.author || 'Unknown'}`}
                    >
                      {addingBookId === `${item.title}-${item.author || 'Unknown'}` ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.addBtnText}>Add to Library</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )}
          />
        </View>
      </KeyboardAvoidingView>

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
    paddingRight: 40, 
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

  loader: { alignItems: 'center', marginVertical: 20 },

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

  addBtn: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: '#10b98166',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },

  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: '#a78bfa' },
  categoriesRow: { paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, marginHorizontal: 6 },
  chipSelected: { backgroundColor: '#8b5cf6' },
  chipText: { color: '#e9d5ff', fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
  categoryContainer: { marginVertical: 8, position: 'relative' },
  categoryInput: { backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, color: '#fff' },
  categoryClearBtn: { position: 'absolute', right: 12, top: 10, padding: 6 },
  dropdown: { position: 'absolute', top: 48, left: 0, right: 0, backgroundColor: '#140022', borderRadius: 10, maxHeight: 220, zIndex: 50, paddingVertical: 6 },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 12 },
  dropdownItemSelected: { backgroundColor: 'rgba(139,92,246,0.15)' },
  dropdownItemText: { color: '#e9d5ff' },
  dropdownItemTextSelected: { color: '#fff', fontWeight: '700' },
  removeBtn: { marginRight: 8, backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  removeBtnText: { color: '#ffd1d1', fontWeight: '700' },
});