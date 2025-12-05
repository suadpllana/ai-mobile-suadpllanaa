/**
 * Centralized Supabase service layer for review operations
 */

import { supabase } from '../supabase';
import { ApiResponse, Review } from '../types';
import { logger } from '../utils/logger';

export class ReviewService {
  /**
   * Fetch all reviews for a user
   */
  static async getUserReviews(userId: string): Promise<ApiResponse<Review[]>> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      logger.error('ReviewService.getUserReviews failed', error);
      return { data: null, error };
    }
  }

  /**
   * Get reviews for a specific book
   */
  static async getBookReviews(bookId: string): Promise<ApiResponse<Review[]>> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('book_id', bookId);

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      logger.error('ReviewService.getBookReviews failed', error);
      return { data: null, error };
    }
  }

  /**
   * Create or update a review
   */
  static async upsertReview(review: Partial<Review>): Promise<ApiResponse<Review>> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .upsert([review], { onConflict: 'book_id,user_id' })
        .select('*')
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      logger.error('ReviewService.upsertReview failed', error);
      return { data: null, error };
    }
  }

  /**
   * Delete a review
   */
  static async deleteReview(bookId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('book_id', bookId)
        .eq('user_id', userId);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error: any) {
      logger.error('ReviewService.deleteReview failed', error);
      return { data: null, error };
    }
  }

  /**
   * Get average rating for a book
   */
  static async getAverageRating(bookId: string): Promise<ApiResponse<number>> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('book_id', bookId);

      if (error) throw error;

      if (!data || data.length === 0) {
        return { data: 0, error: null };
      }

      const sum = data.reduce((acc, review) => acc + review.rating, 0);
      const average = sum / data.length;

      return { data: average, error: null };
    } catch (error: any) {
      logger.error('ReviewService.getAverageRating failed', error);
      return { data: null, error };
    }
  }
}
