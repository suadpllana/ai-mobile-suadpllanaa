import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SelectList } from 'react-native-dropdown-select-list';
import BookCard from '../../components/BookCard';
import BookModal from '../../components/BookModal';
import ChatModal from '../../components/ChatModal';
import { supabase } from '../../supabase';

const { width } = Dimensions.get('window');

type Book = {
  id: string;
  title: string;
  author: string;
  description: string;
  user_id: string;
  category_id?: string;
  status?: string;
  image?: string;
};

type Review = {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: string;
};

type Category = {
  id: string;
  name: string;
  user_id: string;
};

export default function HomeScreen() {
  const DEFAULT_IMAGE = 'https://via.placeholder.com/100x150?text=No+Image';
  const isFocused = useIsFocused();
  const [books, setBooks] = useState<Book[]>([]);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [status, setStatus] = useState<string>('want to read');
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);

  const pulseAnim = new Animated.Value(1);
  const floatAnim = new Animated.Value(0);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    float.start();

    return () => {
      pulse.stop();
      float.stop();
    };
  }, []);

  const categoryOptions = [
    { key: 'all', value: 'All Categories' },
    ...categories.map(c => ({ key: c.id, value: c.name })),
  ];

  const bookCategoryOptions = [
    { key: '', value: 'Select Category' },
    ...categories.map(c => ({ key: c.id, value: c.name })),
  ];

  const statusOptions = [
    { key: 'want to read', value: 'Want to Read' },
    { key: 'reading', value: 'Currently Reading' },
    { key: 'already read', value: 'Already Read' },
  ];

  const openChatModal = () => setChatModalVisible(true);
  const closeChatModal = () => setChatModalVisible(false);
  const openDetails = (b: any) => { setSelectedBook(b); setDetailsVisible(true); };
  const closeDetails = () => { setSelectedBook(null); setDetailsVisible(false); };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session || !session.user) {
          setErrorMessage('No authenticated user found');
          router.replace('./auth');
          return;
        }
        setUserId(session.user.id);
        setSessionChecked(true);
      } catch (error: any) {
        setErrorMessage(error.message || 'Failed to verify session');
        router.replace('./auth');
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUserId(null);
        setSessionChecked(false);
        router.replace('./auth');
      } else {
        setUserId(session.user.id);
        setSessionChecked(true);
        setErrorMessage('');
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId || !sessionChecked) return;

    const initializeData = async () => {
      setLoading(true);
      try {
        const [{ data: booksData }, { data: reviewsData }, { data: categoriesData }] = await Promise.all([
          supabase.from('books').select('*').eq('user_id', userId),
          supabase.from('reviews').select('*').eq('user_id', userId),
          supabase.from('categories').select('*').eq('user_id', userId),
        ]);

        setBooks(booksData || []);
        setReviews(reviewsData || []);
        setCategories(categoriesData || []);

        if (!categoriesData || categoriesData.length === 0) {
          Alert.alert('No Categories', 'Please add a category to continue.');
        }
      } catch (error: any) {
        setErrorMessage(error.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    initializeData();
  }, [userId, sessionChecked, isFocused]);

  const handleAddOrUpdateBook = async () => {
    if (!title || !author || !categoryId) {
      Alert.alert('Error', 'Title, author, and category are required');
      return;
    }
    if (title.length > 255 || author.length > 255) {
      Alert.alert('Error', 'Title and author must be 255 characters or less');
      return;
    }

    setLoading(true);
    try {
      if (editingBook) {
        const { error } = await supabase
          .from('books')
          .update({ title, author, description, category_id: categoryId, status })
          .eq('id', editingBook.id)
          .eq('user_id', userId);
        if (error) throw error;
        Alert.alert('Success', 'Book updated!');
      } else {
        const payload: any = { title, author, description, category_id: categoryId, user_id: userId, image: DEFAULT_IMAGE, status };
        let { error } = await supabase.from('books').insert([payload]);
        if (error) {
          const { error: err2 } = await supabase.from('books').insert([{ title, author, description, category_id: categoryId, user_id: userId, status }]);
          if (err2) throw err2;
        }
        Alert.alert('Success', 'Book added!');
      }

      resetForm();
      const { data } = await supabase.from('books').select('*').eq('user_id', userId);
      setBooks(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle(''); setAuthor(''); setDescription(''); setCategoryId(''); setStatus('want to read'); setEditingBook(null); setModalVisible(false);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return Alert.alert('Error', 'Category name required');
    if (newCategoryName.length > 255) return Alert.alert('Error', 'Too long');

    setLoading(true);
    try {
      const { error } = await supabase.from('categories').insert([{ name: newCategoryName, user_id: userId }]);
      if (error) throw error;
      Alert.alert('Success', 'Category added!');
      setNewCategoryName('');
      setCategoryModalVisible(false);
      const { data } = await supabase.from('categories').select('*').eq('user_id', userId);
      setCategories(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditBook = (book: Book) => {
    if (book.user_id !== userId) return Alert.alert('Error', 'Not your book');
    setEditingBook(book);
    setTitle(book.title);
    setAuthor(book.author);
    setDescription(book.description || '');
    setCategoryId(book.category_id || '');
    setStatus(book.status || 'want to read');
    setModalVisible(true);
  };

  const handleDeleteBook = async (id: string) => {
    Alert.alert('Delete', 'Remove this book?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            const { error } = await supabase.from('books').delete().eq('id', id).eq('user_id', userId);
            if (error) throw error;
            const { data } = await supabase.from('books').select('*').eq('user_id', userId);
            setBooks(data || []);
          } catch (error: any) {
            Alert.alert('Error', error.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleRateBook = async (bookId: string, rating: number) => {
    setLoading(true);
    try {
      const { data: existing } = await supabase.from('reviews').select('*').eq('book_id', bookId).eq('user_id', userId).single();
      if (existing) {
        await supabase.from('reviews').update({ rating }).eq('id', existing.id);
      } else {
        await supabase.from('reviews').insert([{ book_id: bookId, user_id: userId, rating }]);
      }
      const { data } = await supabase.from('reviews').select('*').eq('user_id', userId);
      setReviews(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('./auth');
  };

  const openModal = () => {
    if (categories.length === 0) {
      Alert.alert('No Categories', 'Add one first.');
      setCategoryModalVisible(true);
      return;
    }
    resetForm();
    setModalVisible(true);
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (filterCategoryId === 'all' || book.category_id === filterCategoryId)
  );

  const renderStars = (bookId: string) => {
    const rating = reviews.find(r => r.book_id === bookId && r.user_id === userId)?.rating || 0;
    return (
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => handleRateBook(bookId, star)} disabled={loading}>
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={20}
              color={star <= rating ? '#FFD700' : '#888'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (!sessionChecked) {
    return (
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0f0f23', '#1a1a2e', '#16213e']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Library</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#aaa" style={styles.searchIcon} />
        <TextInput
          placeholder="Search books..."
          placeholderTextColor="#888"
          style={[styles.searchInput, searchQuery ? { paddingRight: 44 } : null]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearBtn}
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close" size={18} color="#aaa" style={styles.clearIcon} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterBar}>
        <SelectList
          setSelected={setFilterCategoryId}
          data={categoryOptions}
          placeholder="All Categories"
          search={false}
          boxStyles={styles.filterBox}
          inputStyles={styles.filterText}
          dropdownStyles={styles.dropdown}
          defaultOption={{ key: 'all', value: 'All Categories' }}
        />
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={openModal}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>Add Book</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.categoryBtn]} onPress={() => setCategoryModalVisible(true)}>
          <Ionicons name="folder-open" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>Category</Text>
        </TouchableOpacity>
      </View>

      {/* Floating AI Assistant */}
      <Animated.View style={[styles.floatingOrb, { transform: [{ scale: pulseAnim }, { translateY: floatAnim }] }]}>
        <TouchableOpacity onPress={openChatModal} style={styles.orbButton}>
          <Text style={styles.orbText}>AI</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Book List */}
      {loading && !books.length ? (
        <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.bookList}
          ListEmptyComponent={<Text style={styles.emptyText}>No books yet. Add one!</Text>}
          renderItem={({ item }) => (
            <BookCard
              book={item}
              categoryName={categories.find(c => c.id === item.category_id)?.name}
              onEdit={handleEditBook}
              onDelete={handleDeleteBook}
              renderStars={renderStars}
              onPress={openDetails}
              imageUrl={item.image || (item as any).image_url || DEFAULT_IMAGE}
            />
          )}
        />
      )}

      {/* Modals */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingBook ? 'Edit Book' : 'New Book'}</Text>

            <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} placeholderTextColor="#aaa" />
            <TextInput style={styles.input} placeholder="Author" value={author} onChangeText={setAuthor} placeholderTextColor="#aaa" />

            <SelectList setSelected={setCategoryId} data={bookCategoryOptions} placeholder="Category" search={false} boxStyles={styles.dropdownBox} />
            <SelectList setSelected={setStatus} data={statusOptions} placeholder="Status" search={false} boxStyles={styles.dropdownBox} />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              placeholderTextColor="#aaa"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddOrUpdateBook} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{editingBook ? 'Update' : 'Add'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      <Modal visible={categoryModalVisible} transparent animationType="fade">
        <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
          <View style={styles.smallModal}>
            <Text style={styles.modalTitle}>New Category</Text>
            <TextInput style={styles.input} placeholder="Name" value={newCategoryName} onChangeText={setNewCategoryName} placeholderTextColor="#aaa" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCategoryModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddCategory}>
                <Text style={styles.saveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      <ChatModal visible={chatModalVisible} onClose={closeChatModal} userId={userId} />
      <BookModal visible={detailsVisible} onClose={closeDetails} book={selectedBook} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  signOutBtn: { padding: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 20, borderRadius: 16, paddingHorizontal: 16, marginBottom: 16, backdropFilter: 'blur(10px)' },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 14 },
  clearBtn: { padding: 8, marginLeft: 8, alignSelf: 'center' },
  clearIcon: {},
  filterBar: { marginHorizontal: 20, marginBottom: 16 },
  filterBox: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 0, borderRadius: 16, paddingHorizontal: 16 },
  filterText: { color: '#fff', fontSize: 16 },
  dropdown: { backgroundColor: '#1e1e2e', borderWidth: 0, borderRadius: 16 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 20, gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139, 92, 246, 0.2)', paddingVertical: 14, borderRadius: 16, gap: 8 },
  categoryBtn: { backgroundColor: 'rgba(34, 197, 94, 0.2)' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  bookList: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyText: { textAlign: 'center', color: '#888', fontSize: 16, marginTop: 50 },
  floatingOrb: { position: 'absolute', bottom: 30, right: 20, zIndex: 1000 },
  orbButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#8b5cf6', shadowOpacity: 0.5, shadowRadius: 20 },
  orbText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: 'rgba(30, 30, 46, 0.95)', padding: 24, borderRadius: 24, width: width * 0.9, maxWidth: 420, backdropFilter: 'blur(20px)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  smallModal: { backgroundColor: 'rgba(30, 30, 46, 0.95)', padding: 24, borderRadius: 24, width: width * 0.8, backdropFilter: 'blur(20px)' },
  modalTitle: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  dropdownBox: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 0, marginBottom: 16, borderRadius: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cancelBtn: { flex: 1, padding: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, marginRight: 8, alignItems: 'center' },
  saveBtn: { flex: 1, padding: 16, backgroundColor: '#8b5cf6', borderRadius: 16, marginLeft: 8, alignItems: 'center' },
  cancelText: { color: '#fff', fontWeight: '600' },
  saveText: { color: '#fff', fontWeight: '700' },
  starRow: { flexDirection: 'row', gap: 4, marginTop: 8 },
  errorText: { color: '#ef4444', textAlign: 'center', marginTop: 20, fontSize: 14 },
});