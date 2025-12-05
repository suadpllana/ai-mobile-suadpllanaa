import { AntDesign, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { supabase } from '../supabase';
import { analytics } from '../utils/analytics';
import { getBookCardLabel, getImageAccessibilityProps, getTouchableAccessibilityProps } from '../utils/accessibility';
import { optimizeBookCoverUrl } from '../utils/imageCache';
import type { Book } from '../types/common';

type Props = {
  book: Book | any;
  categoryName?: string;
  onEdit?: (book: Book | any) => void;
  onDelete: (id: string) => void;
  renderStars: (bookId: string) => React.ReactNode;
  onPress?: (book: Book | any) => void;
  imageUrl?: string | null;
  reloadPage?: boolean;
  fetchFavorites?: () => void;
  setRefreshPage?: (value: React.SetStateAction<boolean>) => void;
};

const blurhash = '|rF?hV%:FhnjWFj@Ni7sR?WCR-D|NIR?WBs1kCae'; 

function BookCardComponent({
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

    const src = imageUrl ||
      book?.imageUrl ||
      book?.image ||
      book?.image_url ||
      book?.cover_image ||
      book?.thumbnail ||
      book?.cover?.large ||
      null;

    // Use optimization utility
    const optimizedUri = optimizeBookCoverUrl(src, book?.id);
    
    setImgUri(optimizedUri);
    setImageLoading(!!optimizedUri);
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
  if (error) return;
      setIsFav(!!data);
      setFavLoading(false);
    } catch (err) {
      // Swallow error silently
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

  if (error) return;

        if (isMounted) setIsFav(!!data);
        setFavLoading(false);
      } catch (err) {
        // Swallow error silently
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
        analytics.trackUserAction('remove_favorite', 'book', { book_id: bookIdToUse });
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
        analytics.trackUserAction('add_favorite', 'book', { book_id: bookIdToUse });
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update favorite');
      analytics.trackError(error as Error, 'toggleFavorite');
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

  // Safely render stars: if the renderStars callback returns a string/number
  // we must wrap it in a <Text> so we don't place raw text directly inside a <View>.
  const renderStarsNode = (() => {
    try {
      const node = renderStars(book.id || book.title);
      if (typeof node === 'string' || typeof node === 'number') {
        return <Text style={styles.actionText}>{String(node)}</Text>;
      }
      return node;
    } catch (err) {
      // If renderStars throws or is undefined, don't break the UI.
      return null;
    }
  })();

  return (
    <TouchableOpacity
      onPress={() => {
        onPress?.(book);
        analytics.trackUserAction('view_book', 'book_card', { book_id: book.id });
      }}
      activeOpacity={0.9}
      style={styles.cardContainer}
      {...getTouchableAccessibilityProps(
        getBookCardLabel(book.title, book.author),
        'Double tap to view book details'
      )}
    >
      <BlurView intensity={80} tint="dark" style={styles.blurCard}>
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
          style={styles.gradientOverlay}
        />

        <View style={styles.cardContent}>
          <View style={styles.thumbnailWrapper}>
            <TouchableOpacity 
              style={styles.favButton} 
              onPress={toggleFavorite} 
              activeOpacity={0.8}
              {...getTouchableAccessibilityProps(
                isFav ? 'Remove from favorites' : 'Add to favorites',
                `Double tap to ${isFav ? 'remove from' : 'add to'} favorites`
              )}
            >
              {favLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  <Ionicons
                    name={isFav ? 'heart' : 'heart-outline'}
                    size={20}
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
            <Text style={styles.title} numberOfLines={2}>
              {typeof book.title === 'string' && book.title.trim() ? book.title : 'Untitled'}
            </Text>
            <Text style={styles.author} numberOfLines={1}>
              {typeof book.author === 'string' && book.author.trim() ? book.author : 'Unknown Author'}
            </Text>

            <View style={styles.metaRow}>
              <Text style={styles.category} numberOfLines={1}>
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
              {renderStarsNode}
            </View>

            <View style={styles.actions}>
              {onEdit && (
                <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => onEdit(book)}>
                  <AntDesign name="edit" size={14} color="#fff" />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => onDelete(book.id)}>
                <AntDesign name="delete" size={14} color="#fff" />
                <Text style={styles.actionText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

const BookCard = React.memo(BookCardComponent);

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 25,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  blurCard: {
    borderRadius: 16,
    backgroundColor: 'rgba(30, 30, 46, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 0,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  thumbnailWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    backgroundColor: '#1a1a2e',
    flexShrink: 0,
  },
  thumbnail: {
    width: 110,
    height: 155,
    borderRadius: 12,
  },
  imageSkeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  favButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 20,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
    paddingTop: 2,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  author: {
    fontSize: 13,
    color: '#d1d5db',
    fontWeight: '500',
  },
  description: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  category: {
    fontSize: 12,
    color: '#a78bfa',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  starsContainer: {
    alignItems: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 4,
  },
  editBtn: {
    backgroundColor: '#3b82f6',
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default BookCard;