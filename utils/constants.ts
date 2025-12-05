/**
 * Application-wide constants
 */

export const BOOK_STATUSES = ['want to read', 'reading', 'already read'] as const;

export const DEFAULT_CATEGORIES = [
  'Fiction', 'Non-Fiction', 'Mystery', 'Science Fiction', 'Fantasy', 'Romance',
  'Biography', 'History', 'Science', 'Technology', 'Business', 'Self-Help',
  'Poetry', 'Drama', 'Comics & Graphic Novels', "Children's Books", 'Young Adult', 'Educational'
] as const;

export const DISCOVER_CATEGORIES = [
  'History', 'Biographies', 'Science', 'Technology', 'Philosophy', 'Psychology', 
  'Business', 'Self-Help', 'Art', 'Photography', 'Travel', 'Cooking', 'Health', 
  'Politics', 'Religion', 'Poetry', 'Fantasy', 'Science Fiction', 'Mystery', 
  'Thriller', 'Romance', 'Young Adult', 'Children', 'Graphic Novels', 'Comics', 
  'Drama', 'Humor', 'Music', 'Nature', 'Environment', 'Sports', 'Education', 
  'Reference', 'Law', 'Medical', 'Economics', 'Sociology', 'Anthropology', 
  'Culture', 'History of Science', 'Classics', 'Mythology', 'Religion & Spirituality', 
  'True Crime', 'Design'
] as const;

export const GOOGLE_BOOKS_API_BASE = 'https://www.googleapis.com/books/v1/volumes';

export const RATING_OPTIONS = [
  { key: 'all', value: 'All Ratings' },
  { key: '5', value: '5 stars' },
  { key: '4', value: '4 stars' },
  { key: '3', value: '3 stars' },
  { key: '2', value: '2 stars' },
  { key: '1', value: '1 star' },
] as const;

export const DEFAULT_IMAGE_PLACEHOLDER = 'https://via.placeholder.com/100x150?text=Book';

export const ANIMATION_DURATIONS = {
  short: 200,
  medium: 300,
  long: 500,
} as const;

export const DEBOUNCE_DELAYS = {
  search: 300,
  input: 150,
} as const;

export const PAGINATION = {
  defaultPageSize: 20,
  loadMoreThreshold: 0.5,
} as const;

export const VALIDATION = {
  minPasswordLength: 8, // Increased from 6 to 8 for better security
  emailRegex: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\\.,;:\s@\"]+\.)+[^<>()[\]\\.,;:\s@\"]{2,})$/i,
  phoneRegex: /^\+?[\d\s\-\(\)]+$/,
  maxInputLength: 5000,
  maxSearchLength: 200,
} as const;

export const RATE_LIMITS = {
  searchPerMinute: 30,
  apiCallsPerMinute: 60,
  uploadPerHour: 10,
} as const;

export const STORAGE_KEYS = {
  homeFilters: '@home:filters:v1',
  userPreferences: '@user:preferences',
  lastSync: '@sync:last',
} as const;

export const NOTIFICATION_CONFIG = {
  dailyReminderHour: 20,
  dailyReminderMinute: 0,
  defaultDailyGoal: 30,
} as const;
