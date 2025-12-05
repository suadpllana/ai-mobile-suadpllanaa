/**
 * Enhanced API service with rate limiting and error handling
 */

import { supabase } from '../supabase';
import { logger } from '../utils/logger';
import { RateLimiter } from '../utils/security';
import { AsyncQueue } from '../utils/performance';

export interface ApiConfig {
  enableRateLimit?: boolean;
  enableQueue?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export class ApiClient {
  private rateLimiter: RateLimiter;
  private queue: AsyncQueue;
  private config: Required<ApiConfig>;

  constructor(config: ApiConfig = {}) {
    this.config = {
      enableRateLimit: config.enableRateLimit ?? true,
      enableQueue: config.enableQueue ?? true,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 1000,
    };

    this.rateLimiter = new RateLimiter(60, 60000); // 60 calls per minute
    this.queue = new AsyncQueue();
  }

  /**
   * Execute API call with rate limiting, queuing, and retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    userId: string,
    operationName: string = 'api_call'
  ): Promise<T> {
    // Check rate limit
    if (this.config.enableRateLimit && !this.rateLimiter.isAllowed(userId)) {
      const error = new Error('Rate limit exceeded. Please try again later.');
      logger.warn(`Rate limit exceeded for user ${userId}`);
      throw error;
    }

    // Execute with queue if enabled
    const executeWithRetry = async (): Promise<T> => {
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
        try {
          logger.debug(`Executing ${operationName}, attempt ${attempt}`);
          const result = await operation();
          return result;
        } catch (error: any) {
          lastError = error;
          logger.warn(
            `${operationName} failed (attempt ${attempt}/${this.config.retryAttempts})`,
            error
          );

          // Don't retry on certain errors
          if (this.isNonRetriableError(error)) {
            throw error;
          }

          // Wait before retry (exponential backoff)
          if (attempt < this.config.retryAttempts) {
            const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
            await this.sleep(delay);
          }
        }
      }

      throw lastError || new Error(`${operationName} failed after ${this.config.retryAttempts} attempts`);
    };

    if (this.config.enableQueue) {
      return this.queue.add(executeWithRetry);
    }

    return executeWithRetry();
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetriableError(error: any): boolean {
    // Don't retry authentication errors, validation errors, etc.
    const nonRetriableCodes = [400, 401, 403, 404, 422];
    
    if (error.status && nonRetriableCodes.includes(error.status)) {
      return true;
    }

    if (error.code && ['PGRST116', 'PGRST204'].includes(error.code)) {
      return true;
    }

    return false;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear rate limit for a user
   */
  clearRateLimit(userId: string): void {
    this.rateLimiter.clear(userId);
  }

  /**
   * Get queue status
   */
  getQueueLength(): number {
    return this.queue.length;
  }
}

// Singleton instance
export const apiClient = new ApiClient({
  enableRateLimit: true,
  enableQueue: true,
  retryAttempts: 3,
  retryDelay: 1000,
});

/**
 * Helper function to wrap Supabase queries with error handling
 */
export async function executeSupabaseQuery<T>(
  query: Promise<{ data: T | null; error: any }>,
  operationName: string
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data, error } = await query;

    if (error) {
      logger.error(`${operationName} failed:`, error);
      return { data: null, error: new Error(error.message || 'Database operation failed') };
    }

    return { data, error: null };
  } catch (error: any) {
    logger.error(`${operationName} exception:`, error);
    return { data: null, error };
  }
}
