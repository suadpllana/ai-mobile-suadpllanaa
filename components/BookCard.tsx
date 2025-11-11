import { AntDesign, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  DevSettings,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { supabase } from '../supabase';
import { useFocusEffect } from 'expo-router';

type Props = {
  book: any;
  categoryName?: string;
  onEdit?: (book: any) => void;
  onDelete: (id: string) => void;
  renderStars: (bookId: string) => React.ReactNode;
  onPress?: (book: any) => void;
  imageUrl?: string | null;
  reloadPage?: boolean;
  fetchFavorites: () => void;
  setRefreshPage?: (value: React.SetStateAction<boolean>) => void;
};

const blurhash = '|rF?hV%:FhnjWFj@Ni7sR?WCR-D|NIR?WBs1kCae'; 

export default function BookCard({
  book,
  categoryName,
  onEdit,
  onDelete,
  renderStars,
  onPress,
  fetchFavorites,
  imageUrl,
  setRefreshPage,
}: Props) {
  const [imgUri, setImgUri] = useState<string>('');
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const bundledPlaceholder = require('../assets/images/image.png');

  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!book && !imageUrl) return;

    let src =
      imageUrl ||
      book?.imageUrl ||
      book?.image ||
      book?.image_url ||
      book?.cover_image ||
      book?.thumbnail ||
      book?.cover?.large ||
      null;

    if (src && src.includes('books.google.com')) {
      src = src.replace('http://', 'https://');
      src += '&edge=curl';
    }

    const hasValid = typeof src === 'string' && src.trim() !== '';
    const finalUri = hasValid
      ? `${src}${src.includes('?') ? '&' : '?'}cb=${book?.id || Date.now()}`
      : '';

    setImgUri(finalUri);
    setImageLoading(hasValid);
  }, [imageUrl, book]);

  useFocusEffect(
    React.useCallback(() => {
      if (book?.id || book?.title) {
        checkFavoriteStatus();
      }
    }, [book?.id, book?.title, book?.author])
  );
  const checkFavoriteStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;
      const bookIdToCheck = book?.id || (book?.title ? `${book.title}::${book.author || 'unknown'}` : null);
      if (!bookIdToCheck) return; 
      const { data, error } = await supabase
        .from('favorites')
        .select('id') 
        .eq('user_id', userId)
        .eq('book_id', bookIdToCheck)
        .maybeSingle();
      if (error) return console.warn('Error checking favorite:', error);
      setIsFav(!!data);
      setFavLoading(false);
    } catch (err) {
      console.warn('Failed to check favorite:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const checkFavoriteStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;

        const bookIdToCheck = book?.id || (book?.title ? `${book.title}::${book.author || 'unknown'}` : null);
        if (!bookIdToCheck) return;

        const { data, error } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', userId)
          .eq('book_id', bookIdToCheck)
          .maybeSingle();

        if (error) return console.warn('Error checking favorite:', error);

        if (isMounted) setIsFav(!!data);
        setFavLoading(false);
      } catch (err) {
        console.warn('Failed to check favorite:', err);
      }
    };

    checkFavoriteStatus();

    const channel = supabase
      .channel('favorites-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'favorites' }, checkFavoriteStatus)
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [book?.id, book?.title, book?.author]);

  const animateHeart = () => {
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.4,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const toggleFavorite = async () => {
    setFavLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        Alert.alert('Not signed in', 'Please sign in to add favorites.');
        return;
      }

      animateHeart();

      const bookIdToUse = book?.id || `${book.title}::${book.author || 'unknown'}`;
      if (!bookIdToUse) return Alert.alert('Error', 'Could not identify book');

      if (isFav) {
        await supabase.from('favorites').delete().eq('user_id', userId).eq('book_id', bookIdToUse);
        Toast.show({ type: 'info', text1: 'Removed from favorites' });
        setIsFav(false);
        setRefreshPage?.(prev => !prev);
      } else {
        const payload = {
          user_id: userId,
          book_id: bookIdToUse,
          title: book.title || 'Untitled',
          author: book.author || 'Unknown',
          image_url: imageUrl || book.image_url || book.imageUrl || null,
          created_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('favorites').insert(payload);
        if (error && !error.message.includes('duplicate')) throw error;

        Toast.show({ type: 'success', text1: 'Added to favorites' });
        setIsFav(true);
        setRefreshPage?.(prev => !prev);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update favorite');
    } finally {
      setFavLoading(false);
      fetchFavorites?.();
    
}
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'want to read': return '#8b5cf6';
      case 'reading': return '#10b981';
      case 'already read': return '#6366f1';
      default: return '#6b7280';
    }
  };

  return (
    <TouchableOpacity
      onPress={() => onPress?.(book)}
      activeOpacity={0.9}
      style={styles.cardContainer}
    >
      <BlurView intensity={80} tint="dark" style={styles.blurCard}>
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
          style={styles.gradientOverlay}
        />

        <View style={styles.thumbnailWrapper}>
          <TouchableOpacity style={styles.favButton} onPress={toggleFavorite} activeOpacity={0.8}>
            {favLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons
                  name={isFav ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isFav ? '#ef4444' : '#ffffff'}
                />
              </Animated.View>
            )}
          </TouchableOpacity>

          <Image
            source={imgUri ? { uri: imgUri } : bundledPlaceholder}
            placeholder={blurhash}
            contentFit="cover"
            transition={300}
            style={styles.thumbnail}
            onLoadEnd={() => setImageLoading(false)}
            onError={() => {
              setImgUri('');
              setImageLoading(false);
            }}
            cachePolicy="disk"
          />

       
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {book.title || 'Untitled'}
          </Text>
          <Text style={styles.author} numberOfLines={1}>
            {book.author || 'Unknown Author'}
          </Text>

          {book.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {book.description}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <Text style={styles.category}>
              {categoryName || 'Uncategorized'}
            </Text>
            {book.status && (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(book.status) + '30' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(book.status) }]}>
                  {book.status}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.starsContainer}>
            {renderStars(book.id || book.title)}
          </View>

          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => onEdit(book)}>
                <AntDesign name="edit" size={16} color="#fff" />
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => onDelete(book.id)}>
              <AntDesign name="delete" size={16} color="#fff" />
              <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  blurCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(30, 30, 46, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 0,
  },
  thumbnailWrapper: {
    position: 'relative',
    alignSelf: 'center',
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    backgroundColor: '#1a1a2e',
  },
  thumbnail: {
    width: 150,
    height: 220,
    borderRadius: 16,
  },
  imageSkeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  favButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 25,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    padding: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  author: {
    fontSize: 15,
    color: '#d1d5db',
    marginBottom: 6,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  category: {
    fontSize: 13,
    color: '#a78bfa',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  starsContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
  },
  editBtn: {
    backgroundColor: '#3b82f6',
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});