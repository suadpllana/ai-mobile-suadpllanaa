/**
 * Common type definitions to replace 'any' types
 */

// Book types with proper type safety
export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  user_id: string;
  category_id?: string | null;
  status?: BookStatus;
  image?: string | null;
  cover_image?: string | null;
  image_url?: string | null;
  thumbnail?: string | null;
  position?: number;
  created_at?: string;
  updated_at?: string;
}

export enum BookStatus {
  WANT_TO_READ = 'want to read',
  CURRENTLY_READING = 'currently reading',
  ALREADY_READ = 'already read',
}

// Google Books API response types
export interface GoogleBook {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      large?: string;
    };
    categories?: string[];
    publishedDate?: string;
    pageCount?: number;
    publisher?: string;
    language?: string;
  };
}

export interface GoogleBooksResponse {
  items?: GoogleBook[];
  totalItems: number;
}

// Review types
export interface Review {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  updated_at?: string;
}

// Category types
export interface Category {
  id: string;
  name: string;
  user_id: string;
  created_at?: string;
}

// Favorite types
export interface Favorite {
  id: string;
  book_id: string;
  user_id: string;
  title: string;
  author: string;
  image_url?: string | null;
  description?: string | null;
  category_id?: string | null;
  categoryName?: string | null;
  created_at: string;
}

// Reading progress types
export interface ReadingProgress {
  id: string;
  user_id?: string;
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
  updated_at?: string;
}

export interface ReadingSession {
  id: string;
  user_id: string;
  pages_read: number;
  reading_duration: string;
  mood?: string;
  location?: string;
  created_at: string;
}

export interface ReadingGoals {
  dailyPages: number;
  completedToday: number;
  streak: number;
}

// User types
export interface UserProfile {
  id: string;
  email: string;
  phone?: string | null;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    phone?: string;
    email_verified?: boolean;
    phone_verified?: boolean;
  };
  created_at?: string;
}

// Chart data types
export interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

// Modal props types
export interface ModalProps {
  visible: boolean;
  onClose: () => void;
}

// Common component props
export interface LoadingProps {
  loading: boolean;
  size?: 'small' | 'large';
  color?: string;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// Form types
export interface FormField {
  value: string;
  error?: string;
  touched?: boolean;
}

export interface FormState {
  [key: string]: FormField;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}
