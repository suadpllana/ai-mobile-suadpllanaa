/**
 * Image utility functions for handling book covers and user uploads
 */

import { DEFAULT_IMAGE_PLACEHOLDER } from './constants';

/**
 * Normalizes image URLs from various sources
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return DEFAULT_IMAGE_PLACEHOLDER;
  }

  let normalizedUrl = url.trim();

  // Convert Google Books HTTP to HTTPS
  if (normalizedUrl.includes('books.google.com')) {
    normalizedUrl = normalizedUrl.replace('http://', 'https://');
    // Add edge curl effect for better book cover display
    if (!normalizedUrl.includes('edge=curl')) {
      normalizedUrl += normalizedUrl.includes('?') ? '&edge=curl' : '?edge=curl';
    }
  }

  return normalizedUrl;
}

/**
 * Extracts the best quality image from various book data sources
 */
export function extractBookImage(book: any): string {
  const possibleSources = [
    book?.imageUrl,
    book?.image,
    book?.image_url,
    book?.cover_image,
    book?.thumbnail,
    book?.cover?.large,
    book?.cover?.medium,
    book?.volumeInfo?.imageLinks?.large,
    book?.volumeInfo?.imageLinks?.thumbnail,
    book?.volumeInfo?.imageLinks?.smallThumbnail,
  ];

  for (const source of possibleSources) {
    if (source && typeof source === 'string' && source.trim()) {
      return normalizeImageUrl(source);
    }
  }

  return DEFAULT_IMAGE_PLACEHOLDER;
}

/**
 * Adds cache busting parameter to image URL
 */
export function addCacheBuster(url: string, id?: string): string {
  if (url === DEFAULT_IMAGE_PLACEHOLDER) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  const cacheBuster = id || Date.now();
  return `${url}${separator}cb=${cacheBuster}`;
}

/**
 * Validates if a URL is a valid image URL
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Gets the file extension from a URI
 */
export function getFileExtension(uri: string): string {
  const parts = uri.split('.');
  const ext = parts[parts.length - 1]?.toLowerCase();
  return ext || 'jpg';
}

/**
 * Gets the MIME type for an image extension
 */
export function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };

  return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
}

/**
 * Generates a unique filename for uploads
 */
export function generateUploadFilename(userId: string, extension?: string): string {
  const ext = extension || 'jpg';
  const timestamp = Date.now();
  return `${userId}/${timestamp}.${ext}`;
}
