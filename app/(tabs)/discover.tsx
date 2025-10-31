import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  // recentBooks removed: Discover should only show search UI and results per request

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user) {
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

  // fetchRecent removed — Discover no longer shows recent additions

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  const searchGoogleBooks = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const resp = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`);
      const data = await resp.json();
      setResults((data.items || []).map((it: any) => ({
        title: it.volumeInfo.title,
        author: it.volumeInfo.authors?.[0] || 'Unknown',
        description: it.volumeInfo.description || it.volumeInfo.subtitle || '',
        image: it.volumeInfo.imageLinks?.thumbnail || it.volumeInfo.imageLinks?.smallThumbnail || it.volumeInfo.imageLinks?.small || null,
        info: it.volumeInfo,
      })));
    } catch (err: any) {
      Alert.alert('Error', 'Failed to search Google Books');
    } finally {
      setLoading(false);
    }
  };

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
        // mark books added from Discover as already read by default
        status: 'already read',
      };

      // If Google Books provides categories, try to create/find a matching category for the user
      const apiCategories = (book as any).info?.categories || null;
      if (apiCategories && apiCategories.length > 0) {
        const catName = apiCategories[0];
        try {
          const { data: existingCat, error: findErr } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', userId)
            .eq('name', catName)
            .maybeSingle();
          if (findErr) throw findErr;
          if (existingCat) {
            payload.category_id = existingCat.id;
          } else {
            const { data: newCat, error: createErr } = await supabase
              .from('categories')
              .insert([{ name: catName, user_id: userId }])
              .select('*')
              .maybeSingle();
            if (createErr) throw createErr;
            payload.category_id = newCat?.id;
          }
        } catch (catErr) {
          // ignore category errors and continue without category
          console.warn('Category create/find error', catErr);
        }
      }

      if ((book as any).image) {
        payload.image = (book as any).image;
        // some schemas use cover_image instead
        payload.cover_image = (book as any).image;
      }

      // Ask Supabase to return the inserted row so we can verify user_id and image were stored
      const res = await supabase.from('books').insert([payload]).select('*').single();

      if (res.error) {
        console.warn('Insert error, retrying without optional columns', res.error);
        // retry without image or category if DB doesn't accept those columns and request returned row
  const retry = await supabase.from('books').insert([{ title: book.title, author: book.author || 'Unknown', description: book.description || '', user_id: userId, status: 'already read' }]).select('*').single();
        if (retry.error) {
          // both attempts failed — show user the error
          Alert.alert('Error', retry.error.message || 'Failed to add book (insert)');
          throw retry.error;
        }
        console.log('Retry inserted book', retry.data);
        // use retry.data for verification below
        (res as any).data = retry.data;
      } else {
        console.log('Inserted book', res.data);
      }

      // Verify insertion by querying for the title and user_id
      try {
        const { data: verifyData, error: verifyError } = await supabase
          .from('books')
          .select('*')
          .eq('user_id', userId)
          .eq('title', book.title)
          .limit(1);
        if (verifyError) {
          console.warn('Verification query error', verifyError);
        }
        if (!verifyData || verifyData.length === 0) {
          // If verification failed, but we have the inserted row from Supabase response, show that info
          const inserted = (res as any).data;
          if (inserted) {
            if (inserted.user_id !== userId) {
              Alert.alert('Warning', 'Book was inserted but user_id does not match the current user. RLS or trigger may be changing ownership.');
            } else if (!inserted.image) {
              Alert.alert('Added without image', `${book.title} was added but the image was not saved.`);
            } else {
              Alert.alert('Added', `${book.title} added to your library`);
            }
            // recent list removed; navigate user to their library instead
            try { router.replace('/home'); } catch (_) {}
          } else {
            Alert.alert('Warning', 'Book add appeared to succeed but the record was not found. Check server logs or RLS policies.');
          }
        } else {
          Alert.alert('Added', `${book.title} added to your library`);
          try { router.replace('/home'); } catch (_) {}
        }
      } catch (vErr) {
        console.warn('Verification failed', vErr);
  Alert.alert('Added', `${book.title} added to your library`);
  try { router.replace('/home'); } catch (_) {}
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add book');
    } finally {
      setLoading(false);
    }
  };

  // Book details modal state
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const openDetails = (b: any) => { setSelectedBook(b); setModalVisible(true); };
  const closeDetails = () => { setSelectedBook(null); setModalVisible(false); };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Discover Books</Text>
      <Text style={styles.subtitle}>Search Google Books and add interesting titles to your library.</Text>

      <View style={styles.row}>
        <TextInput 
          style={[styles.input, { flex: 1 }]} 
          placeholder="Search Google Books..." 
          value={query} 
          onChangeText={setQuery} 
        />
        <TouchableOpacity style={[styles.button, { marginLeft: 8 }]} onPress={searchGoogleBooks} disabled={loading}>
          <Text style={styles.buttonText}>Search</Text>
        </TouchableOpacity>
        {query.length > 0 && (
          <TouchableOpacity 
            style={[styles.button, styles.clearButton, { marginLeft: 8 }]} 
            onPress={clearSearch}
          >
            <Text style={styles.buttonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? <ActivityIndicator /> : null}

      <FlatList
        data={results}
        keyExtractor={(item, idx) => `${item.title}-${idx}`}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.resultCard} onPress={() => openDetails(item)}>
            {item.image ? <Image source={{ uri: item.image }} style={{ width: 80, height: 120, marginBottom: 8, borderRadius: 6 }} /> : null}
            <Text style={styles.resultTitle}>{item.title}</Text>
            <Text style={styles.resultAuthor}>{item.author}</Text>
            {item.description ? <Text style={styles.resultDesc} numberOfLines={3}>{item.description}</Text> : null}
            <TouchableOpacity style={styles.addButton} onPress={() => addToLibrary(item)}>
              <Text style={styles.addButtonText}>Add to my books</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No results — try searching.</Text>}
      />

      <BookModal visible={modalVisible} onClose={closeDetails} book={selectedBook} />

      {/* Recent additions removed — Discover shows only search + results */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: '#666', marginBottom: 12 },
  row: { flexDirection: 'row', marginBottom: 12, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 12, backgroundColor: '#fff' },
  button: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, justifyContent: 'center' },
  clearButton: { backgroundColor: '#dc2626' },
  buttonText: { color: '#fff', fontWeight: '600' },
  resultCard: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8 },
  resultTitle: { fontWeight: '600' },
  resultAuthor: { color: '#666', marginBottom: 6 },
  resultDesc: { color: '#888' },
  addButton: { backgroundColor: '#10b981', padding: 8, borderRadius: 8, marginTop: 8, alignSelf: 'flex-start' },
  addButtonText: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#666', marginTop: 12 },
});
