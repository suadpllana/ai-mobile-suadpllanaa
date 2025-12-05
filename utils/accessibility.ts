/**
 * Accessibility utilities for improved screen reader support
 */

import { AccessibilityInfo } from 'react-native';

/**
 * Check if screen reader is enabled
 */
export const isScreenReaderEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch {
    return false;
  }
};

/**
 * Announce message to screen reader
 */
export const announceForAccessibility = (message: string): void => {
  AccessibilityInfo.announceForAccessibility(message);
};

/**
 * Generate accessible label for star rating
 */
export const getStarRatingLabel = (rating: number, maxRating: number = 5): string => {
  return `Rated ${rating} out of ${maxRating} stars`;
};

/**
 * Generate accessible label for book card
 */
export const getBookCardLabel = (title: string, author: string, rating?: number): string => {
  let label = `Book: ${title} by ${author}`;
  if (rating) {
    label += `. ${getStarRatingLabel(rating)}`;
  }
  return label;
};

/**
 * Generate accessible label for progress indicator
 */
export const getProgressLabel = (current: number, total: number, unit: string = 'pages'): string => {
  const percentage = Math.round((current / total) * 100);
  return `Progress: ${current} of ${total} ${unit}, ${percentage} percent complete`;
};

/**
 * Generate accessible label for date
 */
export const getDateLabel = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Common accessibility props for touchable elements
 */
export const getTouchableAccessibilityProps = (label: string, hint?: string) => ({
  accessible: true,
  accessibilityLabel: label,
  accessibilityHint: hint,
  accessibilityRole: 'button' as const,
});

/**
 * Common accessibility props for text input
 */
export const getTextInputAccessibilityProps = (label: string, hint?: string, value?: string) => ({
  accessible: true,
  accessibilityLabel: label,
  accessibilityHint: hint,
  accessibilityValue: value ? { text: value } : undefined,
  accessibilityRole: 'text' as const,
});

/**
 * Common accessibility props for images
 */
export const getImageAccessibilityProps = (description: string) => ({
  accessible: true,
  accessibilityLabel: description,
  accessibilityRole: 'image' as const,
});

/**
 * Common accessibility props for header
 */
export const getHeaderAccessibilityProps = (text: string) => ({
  accessible: true,
  accessibilityLabel: text,
  accessibilityRole: 'header' as const,
});

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    return false;
  }
};

/**
 * Get animation duration based on reduced motion preference
 */
export const getAnimationDuration = async (defaultDuration: number): Promise<number> => {
  const reducedMotion = await prefersReducedMotion();
  return reducedMotion ? 0 : defaultDuration;
};
