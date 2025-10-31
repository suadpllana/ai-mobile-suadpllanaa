import React, { useEffect } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Animated,
  Easing,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

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
};

export default function BookModal({ visible, onClose, book }: Props) {
  const [imgSource, setImgSource] = React.useState<any>(null);
  const [imageLoading, setImageLoading] = React.useState(true);

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

  return (
    <Modal visible={visible} transparent animationType="none">
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
            {/* Image with Skeleton */}
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

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>{book.title || 'Untitled'}</Text>
              <Text style={styles.author}>{book.author || 'Unknown Author'}</Text>

              <Text style={styles.description}>
                {book.description || 'No description available.'}
              </Text>

              {book.source && (
                <Text style={styles.source}>Source: {book.source}</Text>
              )}
            </View>
          </ScrollView>

          {/* Floating Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.closeGradient}
            >
              <Text style={styles.closeText}>Close</Text>
            </LinearGradient>
          </TouchableOpacity>
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
    bottom: 24,
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
});