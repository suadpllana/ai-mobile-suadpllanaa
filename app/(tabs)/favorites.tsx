import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import BookCard from '../../components/BookCard';
import { supabase } from '../../supabase';

export default function FavoritesScreen() {
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (err) {
      console.warn('Failed to load favorites', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
    const subscription = supabase
      .channel('public:favorites')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'favorites' }, payload => {
        // simple reload on changes to keep UI in sync
        loadFavorites();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const renderItem = ({ item }: { item: any }) => {
    // item is a favorites row; create a book-like object to pass to BookCard
    const book = {
      id: item.book_id,
      title: item.title,
      author: item.author,
      description: item.description || null,
      status: item.status || null,
    };

    const onDeleteFavorite = async (bookId: string) => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (!userId) return;
        await supabase.from('favorites').delete().eq('user_id', userId).eq('book_id', bookId);
        loadFavorites();
      } catch (err) {
        console.warn('Failed to remove favorite', err);
      }
    };

    return (
      <BookCard
        book={book}
        imageUrl={item.image_url}
        onEdit={() => {}}
        onDelete={onDeleteFavorite}
        renderStars={() => null}
        onPress={() => {}}
      />
    );
  };

  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;

  if (!favorites.length) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>No favorites yet.</Text></View>;

  return (
    <FlatList
      data={favorites}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 16 }}
    />
  );
}
