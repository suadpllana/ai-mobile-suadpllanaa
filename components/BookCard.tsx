import { AntDesign } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase';

type Props = {
  book: any;
  categoryName?: string;
  rating?: number;
  onEdit: (book: any) => void;
  onDelete: (id: string) => void;
  renderStars: (bookId: string) => React.ReactNode;
  onPress?: (book: any) => void;
  imageUrl?: string | null;
};
export default function BookCard({ book, categoryName, onEdit, onDelete, renderStars, onPress, imageUrl }: Props) {
  const [imgSource, setImgSource] = useState<any>(
    imageUrl ? { uri: imageUrl } : require('../assets/images/react-logo.png')
  );
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    setImgSource(imageUrl ? { uri: imageUrl } : require('../assets/images/react-logo.png'));
  }, [imageUrl]);

  useEffect(() => {
    let mounted = true;
    // check if this book is favorited by current user
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (!userId) return;
        const { data, error } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', userId)
          .eq('book_id', book.id)
          .maybeSingle();
        if (!mounted) return;
        setIsFav(!!data);
      } catch (err) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [book.id]);

  const onImageError = () => {
    // fallback to a bundled default image
    setImgSource(require('../assets/images/image.png'));
  };

  const toggleFavorite = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        Alert.alert('Not signed in', 'Please sign in to add favorites.');
        return;
      }

      if (isFav) {
        // remove favorite
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('book_id', book.id);
        if (error) throw error;
        setIsFav(false);
      } else {
        // insert favorite (store minimal metadata)
        const payload: any = {
          user_id: userId,
          book_id: book.id,
          title: book.title || null,
          author: book.author || null,
          image_url: imageUrl || null,
        };
        const { error } = await supabase.from('favorites').insert(payload);
        if (error) throw error;
        setIsFav(true);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to update favorites');
    }
  };

  return (
    <TouchableOpacity onPress={() => onPress?.(book)} activeOpacity={0.85}>
      <View style={styles.bookCard}>
        <View style={styles.thumbnailWrap}>
          <Image
            source={imgSource}
            style={styles.thumbnail}
            resizeMode="cover"
            onError={onImageError}
          />
          <TouchableOpacity style={styles.favButton} onPress={toggleFavorite} accessibilityLabel="Toggle favorite">
            {(() => {
              const iconName: any = isFav ? 'heart' : 'heart';
              return <AntDesign name={iconName} size={22} color={isFav ? '#ef4444' : '#374151'} />;
            })()}
          </TouchableOpacity>
        </View>
        <Text style={styles.bookTitle}>{book.title}</Text>
        <Text style={styles.bookAuthor}>{book.author}</Text>
        {book.description ? <Text style={styles.bookDescription} numberOfLines={2}>{book.description}</Text> : null}
        <Text style={styles.bookCategory}>Category: {categoryName || 'Uncategorized'}</Text>
        {book.status ? <Text style={styles.bookStatus}>Status: {typeof book.status === 'string' ? book.status : String(book.status)}</Text> : null}
        {renderStars(book.id)}
        <View style={styles.bookActions}>
          <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => onEdit?.(book)}>
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => onDelete?.(book.id)}>
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bookCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
  },
  bookTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 4 },
  bookAuthor: { fontSize: 16, color: '#666', marginBottom: 4 },
  bookDescription: { fontSize: 14, color: '#888', marginBottom: 8 },
  bookCategory: { fontSize: 14, color: '#666', marginBottom: 8 },
  bookActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  actionButton: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginLeft: 8 },
  editButton: { backgroundColor: '#3b82f6' },
  deleteButton: { backgroundColor: '#dc2626' },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  thumbnail: { width: 100, height: 150, marginBottom: 8 },
  thumbnailWrap: { position: 'relative', alignItems: 'flex-start' },
  favButton: { position: 'absolute', top: 6, right: 6, padding: 6, zIndex: 10 },
  bookStatus: { fontSize: 14, color: '#4b5563', marginBottom: 8 },
});
