import { AntDesign } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../supabase';

type Props = {
  book: any;
  categoryName?: string;
  onEdit: (book: any) => void;
  onDelete: (id: string) => void;
  renderStars: (bookId: string) => React.ReactNode;
  onPress?: (book: any) => void;
  imageUrl?: string | null;
};

export default function BookCard({
  book,
  categoryName,
  onEdit,
  onDelete,
  renderStars,
  onPress,
  imageUrl,
}: Props) {
  const [imgSource, setImgSource] = useState<any>(null);
  const [isFav, setIsFav] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [mounted, setMounted] = useState(true);

  // keep animated values stable across renders
  const heartScale = useRef(new Animated.Value(1)).current;

  // Load image with fallback. Accept image from multiple possible fields
  useEffect(() => {
    // prefer explicit prop first, then check common book fields
    const src =
      imageUrl ||
      (book && ((book as any).imageUrl || (book as any).image || (book as any).image_url || (book as any).cover_image)) ||
      null;

    if (src) {
      const resolved = typeof src === 'string' ? { uri: src } : src;
      setImgSource(resolved);

      // if resolved has a uri, it's remote — show skeleton until load ends
      const isRemote = !!(resolved && (resolved as any).uri);
      setImageLoading(!!isRemote);
    } else {
      setImgSource(require('../assets/images/image.png'));
      setImageLoading(false);
    }
  }, [imageUrl, book]);

  // Check favorite status
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

        if (error) {
          console.warn('Error checking favorite status:', error);
          return;
        }

        if (isMounted) {
          setIsFav(!!data);
        }
      } catch (err) {
        console.warn('Failed to check favorite status:', err);
      }
    };

    checkFavoriteStatus();

    // Listen for changes to favorites
    const channel = supabase
      .channel('favorites-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'favorites' },
        () => checkFavoriteStatus()
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [book?.id, book?.title, book?.author]);

  const onImageError = () => {
    setImgSource(require('../assets/images/image.png'));
    setImageLoading(false);
  };

  const animateHeart = () => {
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.3,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 150,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const toggleFavorite = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        Alert.alert('Not signed in', 'Please sign in to add favorites.');
        return;
      }

      animateHeart();

      // Create a consistent book ID
      const bookIdToUse = book?.id || (book?.title ? `${book.title}::${book.author || 'unknown'}` : null);
      if (!bookIdToUse) {
        Alert.alert('Error', 'Could not identify book');
        return;
      }

      if (isFav) {
        // Remove from favorites
        const { error: delError } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('book_id', bookIdToUse);

        if (delError) throw delError;
        setIsFav(false);
      } else {
        // Add to favorites
        const payload = {
          user_id: userId,
          book_id: bookIdToUse,
          title: book.title || 'Untitled',
          author: book.author || 'Unknown',
          image_url: imageUrl || book.image_url || book.imageUrl || null,
          created_at: new Date().toISOString()
        };

        const { error: insError } = await supabase
          .from('favorites')
          .insert([payload])
          .select()
          .single();

        if (insError) {
          // Check if it failed because it already exists
          const { data: existing } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', userId)
            .eq('book_id', bookIdToUse)
            .maybeSingle();

          if (!existing) throw insError;
        }

        setIsFav(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update favorite');
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
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

        {/* Thumbnail */}
        <View style={styles.thumbnailWrapper}>
          {imageLoading && imgSource && (imgSource as any).uri && (
            <View style={styles.imageSkeleton}>
              <ActivityIndicator size="small" color="#8b5cf6" />
            </View>
          )}
          <Image
            source={imgSource}
            style={styles.thumbnail}
            resizeMode="cover"
            onLoadEnd={() => setImageLoading(false)}
            onError={onImageError}
          />

          {/* Favorite Heart */}
      
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {book.title}
          </Text>
          <Text style={styles.author} numberOfLines={1}>
            {book.author}
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
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(book.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(book.status) }]}>
                  {book.status}
                </Text>
              </View>
            )}
          </View>

          {/* Star Rating */}
          <View style={styles.starsContainer}>
            {renderStars(book.id)}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.editBtn]}
              onPress={() => onEdit(book)}
            >
              <AntDesign name="edit" size={16} color="#fff" />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={() => onDelete(book.id)}
            >
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
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 30, 46, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 0,
  },
  thumbnailWrapper: {
    position: 'relative',
    alignSelf: 'center',
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
  },
  thumbnail: {
    width: 150,
    height: 175,
    borderRadius: 16,
  },
  imageSkeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  favButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  content: {
    padding: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
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
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  category: {
    fontSize: 13,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
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