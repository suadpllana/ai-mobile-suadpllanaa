/**
 * Centralized Supabase service layer for books operations
 * Enhanced with caching, offline support, and analytics
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { ApiResponse, Book } from '../types';
import { analytics } from '../utils/analytics';
import { logger } from '../utils/logger';
import { sanitizeSearchQuery } from '../utils/security';

const CACHE_KEY = 'books_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export class BookService {
  private static cache: { data: Book[]; timestamp: number } | null = null;

  /**
   * Get cached books if available and fresh
   */
  private static async getCachedBooks(): Promise<Book[] | null> {
    try {
      if (this.cache && Date.now() - this.cache.timestamp < CACHE_DURATION) {
        return this.cache.data;
      }

      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          this.cache = parsed;
          return parsed.data;
        }
      }
    } catch (error) {
      logger.error('Failed to get cached books', error);
    }
    return null;
  }

  /**
   * Cache books for offline access
   */
  private static async cacheBooks(books: Book[]): Promise<void> {
    try {
      const cacheData = { data: books, timestamp: Date.now() };
      this.cache = cacheData;
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      logger.error('Failed to cache books', error);
    }
  }

  /**
   * Clear cache
   */
  static async clearCache(): Promise<void> {
    this.cache = null;
    await AsyncStorage.removeItem(CACHE_KEY);
  }
  /**
   * Fetch all books for a user with caching
   */
  static async getUserBooks(userId: string, orderBy: 'created_at' | 'position' = 'created_at', useCache: boolean = true): Promise<ApiResponse<Book[]>> {
    const startTime = Date.now();
    
    try {
      // Try cache first
      if (useCache) {
        const cached = await this.getCachedBooks();
        if (cached) {
          analytics.trackPerformance('books_load_cached', Date.now() - startTime);
          return { data: cached, error: null };
        }
      }

      const { data, error } = await supabase
        .from('books')
        .select('*')
  /**
   * Create a new book with analytics
   */
  static async createBook(book: Partial<Book>): Promise<ApiResponse<Book>> {
    try {
      const { data, error } = await supabase
        .from('books')
        .insert([book])
        .select('*')
        .single();

      if (error) throw error;
      
      // Clear cache to force refresh
      await this.clearCache();
      
      analytics.trackEvent('book_created', {
        status: book.status || 'unknown',
        has_category: !!book.category_id,
      });
      
      return { data, error: null };
    } catch (error: any) {
      logger.error('BookService.createBook failed', error);
      analytics.trackError(error as Error, 'createBook');
      return { data: null, error };
    }
  }   
      // Try to return cached data on error
      const cached = await this.getCachedBooks();
      if (cached) {
        return { data: cached, error: null };
      }
      
      return { data: null, error };
    }
  }

  /**
   * Create a new book
   */
  static async createBook(book: Partial<Book>): Promise<ApiResponse<Book>> {
    try {
      const { data, error } = await supabase
        .from('books')
        .insert([book])
        .select('*')
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      logger.error('BookService.createBook failed', error);
      return { data: null, error };
    }
  }

  /**
   * Update a book
   */
  static async updateBook(id: string, updates: Partial<Book>): Promise<ApiResponse<Book>> {
    try {
      const { data, error } = await supabase
        .from('books')
        .update(updates)
        .eq('id', id)
        .select('*')
  /**
   * Delete a book with analytics
   */
  static async deleteBook(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Clear cache
      await this.clearCache();
      
      analytics.trackEvent('book_deleted', { book_id: id });
      
      return { data: null, error: null };
    } catch (error: any) {
      logger.error('BookService.deleteBook failed', error);
      analytics.trackError(error as Error, 'deleteBook');
      return { data: null, error };
    }
  }     .from('books')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error: any) {
      logger.error('BookService.deleteBook failed', error);
      return { data: null, error };
    }
  }

  /**
   * Update book positions for sorting
   */
  static async updateBookPositions(books: { id: string; position: number }[]): Promise<ApiResponse<void>> {
    try {
      const results = await Promise.all(
        books.map((b) =>
          supabase.from('books').update({ position: b.position }).eq('id', b.id)
        )
      );

      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;

      return { data: null, error: null };
    } catch (error: any) {
      logger.error('BookService.updateBookPositions failed', error);
      return { data: null, error };
    }
  }

  /**
   * Search books by query
   */
  static async searchBooks(userId: string, query: string): Promise<ApiResponse<Book[]>> {
    try {
      const sanitizedQuery = sanitizeSearchQuery(query);
      
      if (!sanitizedQuery) {
        return { data: [], error: null };
      }
      
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', userId)
        .or(`title.ilike.%${sanitizedQuery}%,author.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`);

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      logger.error('BookService.searchBooks failed', error);
      return { data: null, error };
    }
  }
}
