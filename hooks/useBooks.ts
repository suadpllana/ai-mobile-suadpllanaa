/**
 * Custom hook for managing books data
 * Optimized with memoization and caching
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookService } from '../services/bookService';
import { Book } from '../types';
import { logger } from '../utils/logger';
import { ComputationCache } from '../utils/performance';

// Cache for book queries (shared across hook instances)
const booksCache = new ComputationCache<string, Book[]>(50, 300000); // 5 min TTL

export function useBooks(userId: string | null) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBooks = useCallback(async () => {
    if (!userId) return;

    // Check cache first
    const cacheKey = `books_${userId}`;
    const cached = booksCache.get(cacheKey);
    
    if (cached) {
      setBooks(cached);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: err } = await BookService.getUserBooks(userId);

    if (err) {
      setError(err);
      logger.error('useBooks: Failed to fetch books', err);
    } else if (data) {
      setBooks(data);
      // Update cache
      booksCache.set(cacheKey, data);
    }

    setLoading(false);
  }, [userId]);

  const addBook = useCallback(async (book: Partial<Book>) => {
    const { data, error: err } = await BookService.createBook(book);

    if (err) {
      logger.error('useBooks: Failed to add book', err);
      throw err;
    }

    if (data) {
      setBooks(prev => [data, ...prev]);
      
      // Invalidate cache
      if (userId) {
        booksCache.clear();
      }
    }

    return data;
  }, [userId]);

  const updateBook = useCallback(async (id: string, updates: Partial<Book>) => {
    const { data, error: err } = await BookService.updateBook(id, updates);

    if (err) {
      logger.error('useBooks: Failed to update book', err);
      throw err;
    }

    if (data) {
      setBooks(prev => prev.map(book => book.id === id ? data : book));
      
      // Invalidate cache
      if (userId) {
        booksCache.clear();
      }
    }

    return data;
  }, [userId]);

  const deleteBook = useCallback(async (id: string) => {
    const { error: err } = await BookService.deleteBook(id);

    if (err) {
      logger.error('useBooks: Failed to delete book', err);
      throw err;
    }

    setBooks(prev => prev.filter(book => book.id !== id));
    
    // Invalidate cache
    if (userId) {
      booksCache.clear();
    }
  }, [userId]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);
  
  // Memoized computed values
  const bookCount = useMemo(() => books.length, [books.length]);
  
  const booksByStatus = useMemo(() => {
    return {
      wantToRead: books.filter(b => b.status === 'want to read').length,
      reading: books.filter(b => b.status === 'reading').length,
      alreadyRead: books.filter(b => b.status === 'already read').length,
    };
  }, [books]);

  return {
    books,
    loading,
    error,
    refetch: fetchBooks,
    addBook,
    updateBook,
    deleteBook,
    setBooks,
    // Computed values
    bookCount,
    booksByStatus,
  };
}
