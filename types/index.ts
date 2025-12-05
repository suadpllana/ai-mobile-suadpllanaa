/**
 * Centralized type definitions for the application
 * Re-export from common types for better organization
 */

// Re-export all common types
export * from './common';

// Legacy type aliases for backward compatibility
export type { UserProfile as User } from './common';

export interface Category {
  id: string;
  name: string;
  user_id: string;
  created_at?: string;
}

export interface Review {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  book_id: string;
  user_id: string;
  title?: string;
  author?: string;
  description?: string;
  image?: string;
  cover_image?: string;
  category_id?: string;
  categoryName?: string;
  created_at?: string;
}

export interface ReadingProgress {
  id: string;
  user_id: string;
  book_id?: string;
  current_page: number;
  total_pages: number;
  progress_percentage: number;
  reading_status?: 'in_progress' | 'completed' | 'not_started';
  pages_day1?: number;
  pages_day2?: number;
  pages_day3?: number;
  pages_day4?: number;
  pages_day5?: number;
  pages_day6?: number;
  pages_day7?: number;
  manual_pages_today?: number;
  daily_goal?: number;
  streak?: number;
  total_pages_read?: number;
  updated_at?: string;
  books?: Book;
}

export interface User {
  id: string;
  email: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    phone?: string;
    phone_verified?: boolean;
    email_verified?: boolean;
  };
  confirmed_at?: string;
  email_confirmed_at?: string;
}

export interface GoogleBookVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    subtitle?: string;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      small?: string;
      large?: string;
    };
  };
}

export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface FilterOptions {
  categoryId?: string;
  status?: string;
  rating?: string;
  searchQuery?: string;
}
