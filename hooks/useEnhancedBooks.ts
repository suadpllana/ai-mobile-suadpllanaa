/**
 * Advanced hook for managing books with caching, offline support, and optimistic updates
 */

import { useCallback, useEffect, useState } from 'react';
import { BookService } from '../services/bookService';
import type { Book } from '../types/common';
import { analytics } from '../utils/analytics';
import { errorHandler } from '../utils/errorHandler';
import { useOptimizedList } from './useOptimizedList';
import { usePerformanceMonitor } from './usePerformanceMonitor';

export function useEnhancedBooks(userId: string | null) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const { measureAsync } = usePerformanceMonitor('useEnhancedBooks');

  // Optimized list with search and pagination
  const {
    data: displayBooks,
    searchQuery,
    updateSearch,
    loadMore,
    hasMore,
    reset,
  } = useOptimizedList({
    data: books,
    pageSize: 20,
    searchKeys: ['title', 'author', 'description'],
  });

  // Fetch books with performance tracking
  const fetchBooks = useCallback(async (forceRefresh: boolean = false) => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const result = await measureAsync('fetchBooks', async () => {
        return await BookService.getUserBooks(userId, 'created_at', !forceRefresh);
      });

      if (result.error) {
        throw result.error;
      }

      setBooks(result.data || []);
      analytics.trackEvent('books_loaded', { count: result.data?.length || 0 });
    } catch (err) {
      const appError = errorHandler.handleError(err, 'fetchBooks');
      setError(appError.originalError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, measureAsync]);

  // Refresh books
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBooks(true);
  }, [fetchBooks]);

  // Create book with optimistic update
  const createBook = useCallback(async (book: Partial<Book>) => {
    if (!userId) return { data: null, error: new Error('No user ID') };

    // Optimistic update
    const optimisticBook = { ...book, id: `temp-${Date.now()}`, user_id: userId } as Book;
    setBooks(prev => [optimisticBook, ...prev]);

    try {
      const result = await measureAsync('createBook', async () => {
        return await BookService.createBook({ ...book, user_id: userId });
      });

      if (result.error) {
        // Revert optimistic update
        setBooks(prev => prev.filter(b => b.id !== optimisticBook.id));
        throw result.error;
      }

      // Replace optimistic book with real one
      setBooks(prev => [result.data!, ...prev.filter(b => b.id !== optimisticBook.id)]);
      
      errorHandler.showSuccess('Book added successfully');
      return result;
    } catch (err) {
      errorHandler.handleError(err, 'createBook');
      return { data: null, error: err as Error };
    }
  }, [userId, measureAsync]);

  // Update book with optimistic update
  const updateBook = useCallback(async (id: string, updates: Partial<Book>) => {
    // Optimistic update
    setBooks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));

    try {
      const result = await measureAsync('updateBook', async () => {
        return await BookService.updateBook(id, updates);
      });

      if (result.error) {
        // Revert on error
        await fetchBooks();
        throw result.error;
      }

      errorHandler.showSuccess('Book updated successfully');
      return result;
    } catch (err) {
      errorHandler.handleError(err, 'updateBook');
      return { data: null, error: err as Error };
    }
  }, [measureAsync, fetchBooks]);

  // Delete book with optimistic update
  const deleteBook = useCallback(async (id: string) => {
    // Store book for potential revert
    const deletedBook = books.find(b => b.id === id);
    
    // Optimistic update
    setBooks(prev => prev.filter(b => b.id !== id));

    try {
      const result = await measureAsync('deleteBook', async () => {
        return await BookService.deleteBook(id);
      });

      if (result.error) {
        // Revert on error
        if (deletedBook) {
          setBooks(prev => [...prev, deletedBook]);
        }
        throw result.error;
      }

      errorHandler.showSuccess('Book deleted successfully');
      analytics.trackEvent('book_deleted', { book_id: id });
      return result;
    } catch (err) {
      errorHandler.handleError(err, 'deleteBook');
      return { data: null, error: err as Error };
    }
  }, [books, measureAsync]);

  // Initial load
  useEffect(() => {
    fetchBooks();
  }, [userId]);

  return {
    books: displayBooks,
    allBooks: books,
    loading,
    refreshing,
    error,
    searchQuery,
    hasMore,
    fetchBooks,
    refresh,
    createBook,
    updateBook,
    deleteBook,
    updateSearch,
    loadMore,
    reset,
  };
}
