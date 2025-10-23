import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { supabase } from '../../supabase';
import { router } from 'expo-router';

type Book = {
  id: string;
  title: string;
  author: string;
  description: string;
  user_id: string;
};

export default function HomeScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch user and books on mount
  useEffect(() => {
    const initializeUserAndBooks = async () => {
      setLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          Alert.alert('Error', 'No authenticated user found');
          router.replace('/');
          return;
        }
        setUserId(user.id);
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .eq('user_id', user.id);
        if (error) throw error;
        setBooks(data || []);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to fetch books');
      } finally {
        setLoading(false);
      }
    };
    initializeUserAndBooks();
  }, []);

  const handleAddOrUpdateBook = async () => {
    if (!title || !author) {
      Alert.alert('Error', 'Title and author are required');
      return;
    }
    if (title.length > 255 || author.length > 255 || (description && description.length > 255)) {
      Alert.alert('Error', 'Fields must be 255 characters or less');
      return;
    }
    if (!userId) {
      Alert.alert('Error', 'No authenticated user');
      router.replace('/');
      return;
    }

    setLoading(true);
    try {
      if (editingBook) {
        const { error } = await supabase
          .from('books')
          .update({ title, author, description, user_id: userId })
          .eq('id', editingBook.id)
          .eq('user_id', userId);
        if (error) throw error;
        Alert.alert('Success', 'Book updated successfully');
      } else {
        const { error } = await supabase
          .from('books')
          .insert([{ title, author, description, user_id: userId }]);
        if (error) throw error;
        Alert.alert('Success', 'Book added successfully');
      }
      setTitle('');
      setAuthor('');
      setDescription('');
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

  const handleEditBook = (book: Book) => {
    if (book.user_id !== userId) {
      Alert.alert('Error', 'You can only edit your own books');
      return;
    }
    setEditingBook(book);
    setTitle(book.title);
    setAuthor(book.author);
    setDescription(book.description || '');
    setModalVisible(true);
  };

  const handleDeleteBook = async (id: string) => {
    if (!userId) {
      Alert.alert('Error', 'No authenticated user');
      router.replace('/');
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    router.replace('/');
  };

  const openModal = () => {
    setTitle('');
    setAuthor('');
    setDescription('');
    setEditingBook(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setTitle('');
    setAuthor('');
    setDescription('');
    setEditingBook(null);
    setModalVisible(false);
  };

  const renderBook = ({ item }: { item: Book }) => (
    <View style={styles.bookCard}>
      <Text style={styles.bookTitle}>{item.title}</Text>
      <Text style={styles.bookAuthor}>{item.author}</Text>
      {item.description ? (
        <Text style={styles.bookDescription} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
      <View style={styles.bookActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditBook(item)}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteBook(item.id)}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Books</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} disabled={loading}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={openModal}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>Add New Book</Text>
      </TouchableOpacity>

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
                  disabled={loading}
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

      {loading && !books.length ? (
        <ActivityIndicator size="large" color="#6366f1" style={styles.loader} />
      ) : (
        <FlatList
          data={books}
          renderItem={renderBook}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.bookList}
          ListEmptyComponent={<Text style={styles.emptyText}>No books found.</Text>}
        />
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
  submitButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
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
});