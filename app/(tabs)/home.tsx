import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SelectList } from 'react-native-dropdown-select-list';
import BookCard from '../../components/BookCard';
import BookModal from '../../components/BookModal';
import ChatModal from '../../components/ChatModal';
import { supabase } from '../../supabase';

type Book = {
  id: string;
  title: string;
  author: string;
  description: string;
  user_id: string;
  category_id?: string;
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

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export default function HomeScreen() {
  const DEFAULT_IMAGE = 'https://via.placeholder.com/100x150?text=No+Image';
  const isFocused = useIsFocused();
  const [books, setBooks] = useState<Book[]>([]);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
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

  const categoryOptions = [
    { key: 'all', value: 'All Categories' },
    ...categories.map(category => ({
      key: category.id,
      value: category.name,
    })),
  ];

  const bookCategoryOptions = [
    { key: '', value: 'Select Category' },
    ...categories.map(category => ({
      key: category.id,
      value: category.name,
    })),
  ];

  

  const openChatModal = () => {
    setChatModalVisible(true);
  };

  const closeChatModal = () => {
    setChatModalVisible(false);
  };

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
        setErrorMessage('User signed out');
        router.replace('./auth');
      } else {
        setUserId(session.user.id);
        setSessionChecked(true);
        setErrorMessage('');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId || !sessionChecked) return;

    const initializeData = async () => {
      setLoading(true);
      try {
        const { data: booksData, error: booksError } = await supabase
          .from('books')
          .select('*')
          .eq('user_id', userId);
        if (booksError) throw booksError;
        setBooks(booksData || []);

        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('*')
          .eq('user_id', userId);
        if (reviewsError) throw reviewsError;
        setReviews(reviewsData || []);

        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', userId);
        if (categoriesError) throw categoriesError;
        setCategories(categoriesData || []);
        if (!categoriesData || categoriesData.length === 0) {
          Alert.alert('No Categories', 'No categories found. Please add a category to continue.');
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
    // Allow longer descriptions when editing an existing book per request
    if (title.length > 255 || author.length > 255 || (!editingBook && description && description.length > 255)) {
      Alert.alert('Error', 'Title and author must be 255 characters or less; descriptions may be longer when editing');
      return;
    }
    if (!userId) {
      Alert.alert('Error', 'No authenticated user');
      router.replace('./auth');
      return;
    }

    setLoading(true);
    try {
      if (editingBook) {
        const { error } = await supabase
          .from('books')
          .update({ title, author, description, category_id: categoryId, user_id: userId })
          .eq('id', editingBook.id)
          .eq('user_id', userId);
        if (error) throw error;
        Alert.alert('Success', 'Book updated successfully');
      } else {
        // When adding manually, provide a default image. If the DB doesn't have an image column,
        // retry without the image field.
        const payload: any = { title, author, description, category_id: categoryId, user_id: userId, image: DEFAULT_IMAGE };
        let res = await supabase.from('books').insert([payload]);
        if (res.error) {
          const { error } = await supabase.from('books').insert([{ title, author, description, category_id: categoryId, user_id: userId }]);
          if (error) throw error;
        }
        Alert.alert('Success', 'Book added successfully');
      }
      setTitle('');
      setAuthor('');
      setDescription('');
      setCategoryId('');
      setEditingBook(null);
      setModalVisible(false);
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      setBooks(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save book');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName) {
      Alert.alert('Error', 'Category name is required');
      return;
    }
    if (newCategoryName.length > 255) {
      Alert.alert('Error', 'Category name must be 255 characters or less');
      return;
    }
    if (!userId) {
      Alert.alert('Error', 'No authenticated user');
      router.replace('./auth');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName, user_id: userId }]);
      if (error) throw error;
      Alert.alert('Success', 'Category added successfully');
      setNewCategoryName('');
      setCategoryModalVisible(false);
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId);
      if (fetchError) throw fetchError;
      setCategories(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBook = (book: Book) => {
    if (book.user_id !== userId) {
      Alert.alert('Error', 'You can only edit your own books');
      return;
    }
    setEditingBook(book);
    setTitle(book.title);
    setAuthor(book.author);
    setDescription(book.description || '');
    setCategoryId(book.category_id || '');
    setModalVisible(true);
  };

  const handleDeleteBook = async (id: string) => {
    if (!userId) {
      Alert.alert('Error', 'No authenticated user');
      router.replace('./auth');
      return;
    }
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this book?', [
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
              .eq('user_id', userId);
            if (error) throw error;
            Alert.alert('Success', 'Book deleted successfully');
            const { data, error: fetchError } = await supabase
              .from('books')
              .select('*')
              .eq('user_id', userId);
            if (fetchError) throw fetchError;
            setBooks(data || []);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete book');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleRateBook = async (bookId: string, rating: number) => {
    if (!userId) {
      Alert.alert('Error', 'No authenticated user');
      router.replace('./auth');
      return;
    }
    setLoading(true);
    try {
      const { data: existingReview, error: fetchError } = await supabase
        .from('reviews')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', userId)
        .single();
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existingReview) {
        const { error } = await supabase
          .from('reviews')
          .update({ rating })
          .eq('id', existingReview.id)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reviews')
          .insert([{ book_id: bookId, user_id: userId, rating, created_at: new Date().toISOString() }]);
        if (error) throw error;
      }

      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', userId);
      if (reviewsError) throw reviewsError;
      setReviews(reviewsData || []);
      Alert.alert('Success', `Rated ${rating} star${rating > 1 ? 's' : ''}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save rating');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUserId(null);
      setSessionChecked(false);
      setErrorMessage('');
      router.replace('./auth');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign out');
    }
  };

  const openModal = () => {
    if (categories.length === 0) {
      Alert.alert('No Categories', 'Please add a category first.');
      setCategoryModalVisible(true);
      return;
    }
    setTitle('');
    setAuthor('');
    setDescription('');
    setCategoryId(categories[0]?.id || '');
    setEditingBook(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setTitle('');
    setAuthor('');
    setDescription('');
    setCategoryId('');
    setEditingBook(null);
    setModalVisible(false);
  };

  const openCategoryModal = () => {
    setNewCategoryName('');
    setCategoryModalVisible(true);
  };

  const closeCategoryModal = () => {
    setNewCategoryName('');
    setCategoryModalVisible(false);
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategoryId === 'all' || book.category_id === filterCategoryId;
    return matchesSearch && matchesCategory;
  });

  // Book details modal for library items
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const openDetails = (b: any) => { setSelectedBook(b); setDetailsVisible(true); };
  const closeDetails = () => { setSelectedBook(null); setDetailsVisible(false); };

  const renderStars = (bookId: string) => {
    const userReview = reviews.find(review => review.book_id === bookId && review.user_id === userId);
    const rating = userReview ? userReview.rating : 0;

    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity
            key={star}
            onPress={() => handleRateBook(bookId, star)}
            disabled={loading}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={24}
              color={star <= rating ? '#FFD700' : '#999'}
              style={styles.star}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (!sessionChecked) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" style={styles.loader} />
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Books</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} disabled={loading}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by title..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        editable={!loading}
      />

      <View style={styles.selectContainer}>
        <SelectList
          setSelected={(value: string) => setFilterCategoryId(value)}
          data={categoryOptions}
          placeholder="All Categories"
          search={false}
          boxStyles={styles.selectBox}
          inputStyles={styles.selectInput}
          dropdownStyles={styles.selectDropdown}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={openModal}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>Add New Book</Text>
      </TouchableOpacity>

      {/* Add Category button removed per request */}

      {/* Floating assistant button will be rendered absolutely at bottom-right */}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingBook ? 'Edit Book' : 'Add New Book'}
            </Text>
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Book Title"
                value={title}
                onChangeText={setTitle}
                editable={!loading}
              />
              <TextInput
                style={styles.input}
                placeholder="Author"
                value={author}
                onChangeText={setAuthor}
                editable={!loading}
              />
              <View style={styles.selectContainer}>
                <SelectList
                  setSelected={(value: string) => setCategoryId(value)}
                  data={bookCategoryOptions}
                  placeholder="Select Category"
                  search={false}
                  boxStyles={styles.selectBox}
                  inputStyles={styles.selectInput}
                  dropdownStyles={styles.selectDropdown}
                />
              </View>
              {categories.length === 0 && (
                <Text style={styles.errorText}>No categories available. Please add a category first.</Text>
              )}
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                placeholder="Description (optional)"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                editable={!loading}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={closeModal}
                  disabled={loading}
                >
                  <Text style={styles.actionButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.disabledButton]}
                  onPress={handleAddOrUpdateBook}
                  disabled={loading || categories.length === 0}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {editingBook ? 'Update Book' : 'Add Book'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={categoryModalVisible}
        onRequestClose={closeCategoryModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Category</Text>
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Category Name"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                editable={!loading}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={closeCategoryModal}
                  disabled={loading}
                >
                  <Text style={styles.actionButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.disabledButton]}
                  onPress={handleAddCategory}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Add Category</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <ChatModal visible={chatModalVisible} onClose={closeChatModal} userId={userId} />

      {/* Floating AI assistant button */}
      <TouchableOpacity
        onPress={openChatModal}
        style={styles.floatingAssistant}
        accessibilityLabel="Open AI Book Chat"
      >
        <Text style={styles.floatingAssistantText}>AI</Text>
      </TouchableOpacity>

      {loading && !books.length ? (
        <ActivityIndicator size="large" color="#6366f1" style={styles.loader} />
      ) : (
        <>
        <FlatList
          data={filteredBooks}
          renderItem={({ item }) => (
        <BookCard
              book={item}
              categoryName={categories.find(c => c.id === item.category_id)?.name}
              onEdit={handleEditBook}
              onDelete={handleDeleteBook}
              renderStars={renderStars}
              onPress={openDetails}
          imageUrl={(item as any).image || (item as any).image_url || (item as any).cover_image || null}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.bookList}
          ListEmptyComponent={<Text style={styles.emptyText}>No books found.</Text>}
        />
        <BookModal visible={detailsVisible} onClose={closeDetails} book={selectedBook} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  signOutButton: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  selectContainer: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  selectBox: {
    borderWidth: 0,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  selectInput: {
    fontSize: 16,
    color: '#333',
  },
  selectDropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    elevation: 5,
  },
  chatModalContent: {
    flex: 1,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  chatContainer: {
    flex: 1,
    marginBottom: 12,
  },
  chatList: {
    paddingBottom: 10,
    flexGrow: 1,
  },
  chatMessage: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#6366f1',
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    backgroundColor: '#e5e7eb',
    alignSelf: 'flex-start',
  },
  chatText: {
    color: '#333',
    fontSize: 14,
  },
  chatInput: {
    flex: 1,
    marginRight: 8,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  addCategoryButton: {
    backgroundColor: '#10b981',
  },
  chatButton: {
    backgroundColor: '#8b5cf6',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#a5b4fc',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  bookList: {
    paddingBottom: 20,
  },
  bookCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  bookDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  bookCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bookActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#3b82f6',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  loader: {
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  starContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  star: {
    marginRight: 4,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  floatingAssistant: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    zIndex: 1000,
  },
  floatingAssistantText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
});