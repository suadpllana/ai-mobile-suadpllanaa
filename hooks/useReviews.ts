/**
 * Custom hook for managing reviews data
 */

import { useCallback, useEffect, useState } from 'react';
import { ReviewService } from '../services/reviewService';
import { Review } from '../types';
import { logger } from '../utils/logger';

export function useReviews(userId: string | null) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    const { data, error: err } = await ReviewService.getUserReviews(userId);

    if (err) {
      setError(err);
      logger.error('useReviews: Failed to fetch reviews', err);
    } else {
      setReviews(data || []);
    }

    setLoading(false);
  }, [userId]);

  const upsertReview = useCallback(async (review: Partial<Review>) => {
    const { data, error: err } = await ReviewService.upsertReview(review);

    if (err) {
      logger.error('useReviews: Failed to upsert review', err);
      throw err;
    }

    if (data) {
      setReviews(prev => {
        const existing = prev.find(r => r.book_id === data.book_id);
        if (existing) {
          return prev.map(r => r.book_id === data.book_id ? data : r);
        }
        return [...prev, data];
      });
    }

    return data;
  }, []);

  const deleteReview = useCallback(async (bookId: string, userId: string) => {
    const { error: err } = await ReviewService.deleteReview(bookId, userId);

    if (err) {
      logger.error('useReviews: Failed to delete review', err);
      throw err;
    }

    setReviews(prev => prev.filter(r => r.book_id !== bookId));
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return {
    reviews,
    loading,
    error,
    refetch: fetchReviews,
    upsertReview,
    deleteReview,
    setReviews,
  };
}
