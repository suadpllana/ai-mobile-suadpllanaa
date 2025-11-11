import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  LayoutAnimation,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { setRequestedAuthor } from '../lib/authorNav';

const { width, height } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  visible: boolean;
  onClose: () => void;
  book: {
    title?: string;
    author?: string;
    description?: string;
    imageUrl?: string | null;
    source?: string;
    image?: string;
    image_url?: string;
    cover_image?: string;
  } | null;
  showAddToLibrary?: boolean;
  addToLibrary: (book: {
    title?: string;
    author?: string;
    description?: string;
    imageUrl?: string | null;
    source?: string;
    image?: string;
    image_url?: string;
    cover_image?: string;
  }) => void;
};

export default function BookModal({ visible, addToLibrary, onClose, book, showAddToLibrary = true }: Props) {
  const [imgSource, setImgSource] = useState<any>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  const bundledDefault = require('../assets/images/react-logo.png');
  const bundledFallback = require('../assets/images/image.png');

  useEffect(() => {
    if (!book) return;

    const imageSrc =
      book.imageUrl ||
      (book as any).image ||
      (book as any).image_url ||
      (book as any).cover_image ||
      null;

    setImgSource(imageSrc ? { uri: imageSrc } : bundledDefault);
    setImageLoading(true);
    setExpanded(false);
  }, [book]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 50, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const onImageError = () => {
    setImgSource(bundledFallback);
    setImageLoading(false);
  };

  if (!book) return null;

  const isLong = book?.description && book.description.length > 120;
  const displayedText =
    expanded || !isLong
      ? book?.description
      : book?.description?.slice(0, 120) + '...';

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <Modal visible={visible}  transparent animationType="none">
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)', 'transparent']}
            style={styles.gradientTop}
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.imageContainer}>
              {imageLoading && imgSource?.uri && (
                <View style={styles.skeleton}>
                  <ActivityIndicator size="large" color="#8b5cf6" />
                </View>
              )}
              <Image
                source={imgSource}
                style={styles.image}
                resizeMode="contain"
                onLoadEnd={() => setImageLoading(false)}
                onError={onImageError}
              />
            </View>

            <View style={styles.content}>
              <Text style={styles.title}>{book.title || 'Untitled'}</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  const author = book.author?.trim();
                  if (!author) return;
                  onClose();
                  setRequestedAuthor(author);
                  router.push('/authors');
                }}
                style={{ alignSelf: 'center' }}
              >
                <Text style={[styles.author, { textDecorationLine: 'underline' }]}>{book.author || 'Unknown Author'}</Text>
              </TouchableOpacity>

              {book.description ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.description}>{displayedText}</Text>

                  {isLong && (
                    <TouchableOpacity
                      onPress={toggleExpanded}
                      activeOpacity={0.7}
                      style={{ alignSelf: 'flex-end', marginTop: 6 }}
                    >
                      <Text style={{ color: '#8b5cf6', fontWeight: '600', marginBottom: 50 }}>
                        {expanded ? 'Read less ▲' : 'Read more ▼'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Text style={[styles.description, { fontStyle: 'italic', opacity: 0.7 }]}>
                  No description available.
                </Text>
              )}

              {book.source && <Text style={styles.source}>Source: {book.source}</Text>}
              
            </View>
          </ScrollView>
          <View style={styles.buttonsContainer}>
            {showAddToLibrary && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  addToLibrary(book as any);
                  onClose();
                }}
                style={styles.addButton}
              >
                <LinearGradient colors={['#06b6d4', '#0891b2']} style={styles.addGradient}>
                  <Text style={styles.addText}>Add to library</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <View style={styles.rowButtons}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  const query = `${book?.title || ''} ${book?.author || ''}`.trim();
                  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`;

                  fetch(url)
                    .then(response => response.json())
                    .then(data => {
                      if (data.items && data.items[0] && data.items[0].volumeInfo.previewLink) {
                        Linking.openURL(data.items[0].volumeInfo.previewLink);
                      } else {
                        Alert.alert('Not Available', 'Preview is not available for this book.');
                      }
                    })
                    .catch(() => {
                      Alert.alert('Error', 'Could not find book preview.');
                    });
                }}
                style={styles.readBtn}
              >
                <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.readGradient}>
                  <Text style={styles.readText}>Read the book</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
                <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.closeGradient}>
                  <Text style={styles.closeText}>Close</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    maxHeight: height * 0.85,
    backgroundColor: 'rgba(26, 26, 46, 0.92)',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    zIndex: 0,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  imageContainer: {
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  skeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  author: {
    fontSize: 18,
    color: '#c4b5fd',
    marginBottom: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#e5e7eb',
    lineHeight: 22,
    textAlign: 'justify',
  },
  source: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    bottom: 14,
    left: 24,
    right: 24,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#ef4444',
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  closeGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonsContainer: {
    position: 'absolute',
    bottom: 14,
    left: 24,
    right: 24,
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    elevation: 6,
  },
  addGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  addText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  readBtn: {
    flex: 1,
    marginRight: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  closeBtn: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  readGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  readText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});