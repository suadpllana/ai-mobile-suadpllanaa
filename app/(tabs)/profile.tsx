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
} from 'react-native';
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
        // Fetch user data
        const { data: { user: u }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        setUser(u || null);

        if (u) {
          // Fetch books
          const { data: booksData, error: booksError } = await supabase
            .from('books')
            .select('*')
            .eq('user_id', u.id);
          if (booksError) throw booksError;
          setBooks(booksData || []);

          // Fetch categories
          const { data: categoriesData, error: categoriesError } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', u.id);
          if (categoriesError) throw categoriesError;
          setCategories(categoriesData || []);
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/auth');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to sign out');
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!user) {
      Alert.alert('Error', 'No authenticated user');
      router.replace('/auth');
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
              .eq('user_id', user.id);
            if (error) throw error;
            Alert.alert('Success', 'Book deleted successfully');
            setBooks(books.filter(book => book.id !== id));
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete book');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!user) {
      Alert.alert('Error', 'No authenticated user');
      router.replace('/auth');
      return;
    }
    // Check if category is in use by any books
    const { data: booksUsingCategory, error: booksError } = await supabase
      .from('books')
      .select('id')
      .eq('category_id', id)
      .eq('user_id', user.id);
    if (booksError) {
      Alert.alert('Error', booksError.message || 'Failed to check category usage');
      return;
    }
    if (booksUsingCategory && booksUsingCategory.length > 0) {
      Alert.alert('Error', 'Cannot delete category because it is used by one or more books.');
      return;
    }
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this category?', [
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
            Alert.alert('Success', 'Category deleted successfully');
            setCategories(categories.filter(category => category.id !== id));
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete category');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  if (loading && !user && !books.length && !categories.length) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {user ? (
        <>
          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email}</Text>

            <Text style={styles.label}>First Name</Text>
            <Text style={styles.value}>{user.user_metadata?.first_name || 'Not set'}</Text>

            <Text style={styles.label}>Last Name</Text>
            <Text style={styles.value}>{user.user_metadata?.last_name || 'Not set'}</Text>

            <Text style={styles.label}>Account Created</Text>
            <Text style={styles.value}>{new Date(user.created_at).toLocaleDateString()}</Text>

            <TouchableOpacity style={[styles.button, styles.signOut]} onPress={handleSignOut}>
              <Text style={styles.buttonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, styles.sectionTitle]}>My Books</Text>
          {books.length > 0 ? (
            books.map(book => (
              <View key={book.id} style={styles.itemCard}>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{book.title}</Text>
                  <Text style={styles.itemSubtitle}>
                  {categories.find(c => c.id === book.category_id)?.name || 'Uncategorized'}
                    </Text>                
                    </View>
                <TouchableOpacity
                  style={[styles.button, styles.deleteButton]}
                  onPress={() => handleDeleteBook(book.id)}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No books found.</Text>
          )}

          <Text style={[styles.title, styles.sectionTitle]}>My Categories</Text>
          {categories.length > 0 ? (
            categories.map(category => (
              <View key={category.id} style={styles.itemCard}>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{category.name}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.button, styles.deleteButton]}
                  onPress={() => handleDeleteCategory(category.id)}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No categories found.</Text>
          )}
        </>
      ) : (
        <Text style={styles.loadingText}>No user data available. Please sign in.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12, color: '#333' },
  sectionTitle: { marginTop: 24 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16 },
  itemCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  itemSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  label: { fontSize: 14, color: '#666', marginTop: 12 },
  value: { fontSize: 16, color: '#111' },
  button: { backgroundColor: '#6366f1', padding: 12, borderRadius: 8, alignItems: 'center' },
  signOut: { backgroundColor: '#dc2626', marginTop: 12 },
  deleteButton: { backgroundColor: '#dc2626', paddingVertical: 8, paddingHorizontal: 16 },
  buttonText: { color: '#fff', fontWeight: '600' },
  loadingText: { color: '#666', textAlign: 'center', marginTop: 20 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 12, fontSize: 16 },
});