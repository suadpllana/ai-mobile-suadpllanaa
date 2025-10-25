import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BookModal from '../../components/BookModal';
import { supabase } from '../../supabase';

export default function RecommendScreen() {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
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
      // Load initial curated picks
      loadCuratedPicks();
    };
    init();
  }, []);

  const loadCuratedPicks = async () => {
    setLoading(true);
    try {
      const resp = await fetch('https://www.googleapis.com/books/v1/volumes?q=bestseller&maxResults=12');
      const data = await resp.json();
      setRecommendations((data.items || []).map((it: any) => ({
        title: it.volumeInfo.title,
        author: it.volumeInfo.authors?.[0] || 'Unknown',
        description: it.volumeInfo.description || it.volumeInfo.subtitle || '',
        image: it.volumeInfo.imageLinks?.thumbnail || it.volumeInfo.imageLinks?.smallThumbnail || null,
        info: it.volumeInfo,
      })));
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const addToLibrary = async (book: any) => {
    if (!userId) return router.replace('/auth');
    setLoading(true);
    try {
      const payload: any = {
        title: book.title,
        author: book.author || 'Unknown',
        description: book.description || '',
        user_id: userId,
      };
      if (book.image) {
        payload.image = book.image;
        payload.cover_image = book.image;
      }
      // Try to add category from API if present
      const apiCategories = book.info?.categories || null;
      if (apiCategories && apiCategories.length) {
        const catName = apiCategories[0];
        const { data: existingCat } = await supabase.from('categories').select('*').eq('user_id', userId).eq('name', catName).maybeSingle();
        if (existingCat) payload.category_id = existingCat.id;
        else {
          const { data: newCat } = await supabase.from('categories').insert([{ name: catName, user_id: userId }]).select('*').maybeSingle();
          payload.category_id = newCat?.id;
        }
      }

      // Request the inserted row back to verify image/user_id were stored
      const res = await supabase.from('books').insert([payload]).select('*').single();
      if (res.error) {
        console.warn('Insert error', res.error);
        const retry = await supabase.from('books').insert([{ title: book.title, author: book.author || 'Unknown', description: book.description || '', user_id: userId }]).select('*').single();
        if (retry.error) {
          Alert.alert('Error', retry.error.message || 'Failed to add to library');
          throw retry.error;
        }
        (res as any).data = retry.data;
      }

      const inserted = (res as any).data;
      if (!inserted) {
        Alert.alert('Warning', 'Book add appeared to succeed but the returned record is empty. Check RLS/policies.');
      } else {
        if (inserted.user_id !== userId) {
          Alert.alert('Warning', 'Book was inserted but user_id does not match current user.');
        } else if (!inserted.image) {
          Alert.alert('Added without image', `${book.title} added but image not saved.`);
        } else {
          Alert.alert('Added', `${book.title} added to your library`);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add to library');
    } finally {
      setLoading(false);
    }
  };

  const openDetails = (b: any) => { setSelected(b); setModalVisible(true); };
  const closeDetails = () => { setSelected(null); setModalVisible(false); };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recommendations</Text>
      <Text style={styles.subtitle}>Curated picks and personalized suggestions based on your library.</Text>

      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <TouchableOpacity style={styles.pill} onPress={loadCuratedPicks}>
          <Text style={styles.pillText}>Curated Picks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.pill}
          onPress={async () => {
            // Personalized suggestions: use the first author from user's library
            setLoading(true);
            try {
              const { data: userBooks } = await supabase.from('books').select('*').eq('user_id', userId).limit(10);
              const first = (userBooks || [])[0];
              if (!first) {
                Alert.alert('No library', 'Add some books to your library first for personalized suggestions.');
                return;
              }
              const q = encodeURIComponent(first.author || first.title || 'fiction');
              const resp = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=12`);
              const data = await resp.json();
              setRecommendations((data.items || []).map((it: any) => ({
                title: it.volumeInfo.title,
                author: it.volumeInfo.authors?.[0] || 'Unknown',
                description: it.volumeInfo.description || it.volumeInfo.subtitle || '',
                image: it.volumeInfo.imageLinks?.thumbnail || it.volumeInfo.imageLinks?.smallThumbnail || null,
                info: it.volumeInfo,
              })));
            } catch (err: any) {
              Alert.alert('Error', 'Failed to load personalized suggestions');
            } finally {
              setLoading(false);
            }
          }}
        >
          <Text style={styles.pillText}>Based on Library</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator /> : null}

      <FlatList
        data={recommendations}
        keyExtractor={(item, idx) => `${item.title}-${idx}`}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.image ? <Image source={{ uri: item.image }} style={styles.thumb} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardAuthor}>{item.author}</Text>
              <TouchableOpacity style={styles.addButton} onPress={() => addToLibrary(item)}>
                <Text style={styles.addText}>Add to my books</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No recommendations yet.</Text>}
      />

      <BookModal visible={modalVisible} onClose={closeDetails} book={selected} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: '#666', marginBottom: 12 },
  pill: { backgroundColor: '#eef2ff', padding: 8, borderRadius: 12, marginRight: 8 },
  pillText: { color: '#4f46e5', fontWeight: '600' },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8 },
  thumb: { width: 80, height: 120, marginRight: 12, borderRadius: 6 },
  cardTitle: { fontWeight: '600' },
  cardAuthor: { color: '#666', marginBottom: 8 },
  addButton: { backgroundColor: '#10b981', padding: 8, borderRadius: 8, alignSelf: 'flex-start' },
  addText: { color: '#fff', fontWeight: '600' },
  empty: { color: '#666', textAlign: 'center', marginTop: 12 },
});
