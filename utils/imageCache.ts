/**
 * Enhanced image utilities with lazy loading and caching
 */

import * as FileSystem from 'expo-file-system';
import { Image } from 'react-native';

const IMAGE_CACHE_DIR = `${FileSystem.cacheDirectory}images/`;

class ImageCache {
  private initialized = false;

  /**
   * Initialize cache directory
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const dirInfo = await FileSystem.getInfoAsync(IMAGE_CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(IMAGE_CACHE_DIR, { intermediates: true });
      }
      this.initialized = true;
    } catch (error) {
      console.warn('Failed to initialize image cache:', error);
    }
  }

  /**
   * Get cached image path or download and cache
   */
  async getCachedImage(uri: string): Promise<string> {
    await this.initialize();

    if (!uri || !uri.startsWith('http')) {
      return uri;
    }

    try {
      const filename = this.generateFilename(uri);
      const filePath = `${IMAGE_CACHE_DIR}${filename}`;

      // Check if already cached
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        return filePath;
      }

      // Download and cache
      const downloadResult = await FileSystem.downloadAsync(uri, filePath);
      return downloadResult.uri;
    } catch (error) {
      console.warn('Failed to cache image:', error);
      return uri; // Fallback to original URI
    }
  }

  /**
   * Prefetch image to cache
   */
  async prefetchImage(uri: string): Promise<void> {
    await this.getCachedImage(uri);
  }

  /**
   * Prefetch multiple images
   */
  async prefetchImages(uris: string[]): Promise<void> {
    await Promise.all(uris.map(uri => this.prefetchImage(uri)));
  }

  /**
   * Clear image cache
   */
  async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(IMAGE_CACHE_DIR, { idempotent: true });
      this.initialized = false;
    } catch (error) {
      console.warn('Failed to clear image cache:', error);
    }
  }

  /**
   * Get cache size
   */
  async getCacheSize(): Promise<number> {
    await this.initialize();

    try {
      const files = await FileSystem.readDirectoryAsync(IMAGE_CACHE_DIR);
      let totalSize = 0;

      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${IMAGE_CACHE_DIR}${file}`);
        totalSize += fileInfo.size || 0;
      }

      return totalSize;
    } catch (error) {
      console.warn('Failed to get cache size:', error);
      return 0;
    }
  }

  /**
   * Generate unique filename from URI
   */
  private generateFilename(uri: string): string {
    // Remove query params and create hash-like filename
    const cleanUri = uri.split('?')[0];
    const extension = cleanUri.split('.').pop()?.split('?')[0] || 'jpg';
    const hash = this.simpleHash(cleanUri);
    return `${hash}.${extension}`;
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

export const imageCache = new ImageCache();

/**
 * Optimize book cover image URL
 */
export const optimizeBookCoverUrl = (url: string | null | undefined, bookId?: string): string => {
  if (!url) return '';

  let optimizedUrl = url;

  // Ensure HTTPS for Google Books
  if (optimizedUrl.includes('books.google.com')) {
    optimizedUrl = optimizedUrl.replace('http://', 'https://');
    
    // Add better quality and curl effect
    if (!optimizedUrl.includes('edge=curl')) {
      optimizedUrl += optimizedUrl.includes('?') ? '&edge=curl' : '?edge=curl';
    }
  }

  // Add cache busting param
  const cacheBuster = bookId || Date.now();
  optimizedUrl += optimizedUrl.includes('?') ? '&' : '?';
  optimizedUrl += `cb=${cacheBuster}`;

  return optimizedUrl;
};

/**
 * Prefetch book cover images for better performance
 */
export const prefetchBookCovers = async (books: Array<{ image?: string; cover_image?: string; id?: string }>): Promise<void> => {
  const urls = books
    .map(book => book.image || book.cover_image)
    .filter((url): url is string => !!url && url.startsWith('http'));

  if (urls.length === 0) return;

  try {
    // Prefetch in batches of 5
    const batchSize = 5;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      await Promise.all(batch.map(url => Image.prefetch(url)));
    }
  } catch (error) {
    console.warn('Failed to prefetch images:', error);
  }
};

/**
 * Get image dimensions
 */
export const getImageDimensions = (uri: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
};

/**
 * Validate image URL
 */
export const isValidImageUrl = async (url: string): Promise<boolean> => {
  if (!url || !url.startsWith('http')) return false;

  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    return contentType?.startsWith('image/') || false;
  } catch {
    return false;
  }
};
