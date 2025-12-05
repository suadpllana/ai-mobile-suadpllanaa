/**
 * Centralized error handling utility
 * Provides consistent error messages and logging across the app
 */

import Toast from 'react-native-toast-message';
import { logger } from './logger';

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION = 'PERMISSION',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: any;
  userMessage: string;
}

class ErrorHandler {
  /**
   * Parse and categorize errors
   */
  parseError(error: any): AppError {
    // Network errors
    if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      return {
        type: ErrorType.NETWORK,
        message: error.message,
        originalError: error,
        userMessage: 'Network error. Please check your connection and try again.',
      };
    }

    // Auth errors
    if (error?.message?.includes('auth') || error?.message?.includes('token')) {
      return {
        type: ErrorType.AUTH,
        message: error.message,
        originalError: error,
        userMessage: 'Authentication error. Please log in again.',
      };
    }

    // Supabase specific errors
    if (error?.code) {
      switch (error.code) {
        case '23505':
          return {
            type: ErrorType.VALIDATION,
            message: 'Duplicate entry',
            originalError: error,
            userMessage: 'This item already exists.',
          };
        case 'PGRST116':
          return {
            type: ErrorType.NOT_FOUND,
            message: 'Resource not found',
            originalError: error,
            userMessage: 'The requested item was not found.',
          };
        case '42501':
          return {
            type: ErrorType.PERMISSION,
            message: 'Permission denied',
            originalError: error,
            userMessage: 'You do not have permission to perform this action.',
          };
      }
    }

    // Default error
    return {
      type: ErrorType.UNKNOWN,
      message: error?.message || 'An error occurred',
      originalError: error,
      userMessage: error?.message || 'Something went wrong. Please try again.',
    };
  }

  /**
   * Handle error with logging and user notification
   */
  handleError(error: any, context?: string): AppError {
    const parsedError = this.parseError(error);
    
    // Log the error
    logger.error(
      context ? `Error in ${context}` : 'Error occurred',
      parsedError.originalError || error
    );

    // Show user-friendly toast
    Toast.show({
      type: 'error',
      text1: this.getErrorTitle(parsedError.type),
      text2: parsedError.userMessage,
      position: 'top',
      visibilityTime: 4000,
    });

    return parsedError;
  }

  /**
   * Handle error silently (log only, no toast)
   */
  handleSilentError(error: any, context?: string): AppError {
    const parsedError = this.parseError(error);
    logger.error(
      context ? `Silent error in ${context}` : 'Silent error occurred',
      parsedError.originalError || error
    );
    return parsedError;
  }

  /**
   * Handle async operations with automatic error handling
   */
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: string,
    silent = false
  ): Promise<{ data: T | null; error: AppError | null }> {
    try {
      const data = await operation();
      return { data, error: null };
    } catch (error) {
      const appError = silent
        ? this.handleSilentError(error, context)
        : this.handleError(error, context);
      return { data: null, error: appError };
    }
  }

  /**
   * Get user-friendly error title
   */
  private getErrorTitle(type: ErrorType): string {
    switch (type) {
      case ErrorType.NETWORK:
        return 'Connection Error';
      case ErrorType.AUTH:
        return 'Authentication Error';
      case ErrorType.VALIDATION:
        return 'Validation Error';
      case ErrorType.NOT_FOUND:
        return 'Not Found';
      case ErrorType.PERMISSION:
        return 'Permission Denied';
      case ErrorType.SERVER:
        return 'Server Error';
      default:
        return 'Error';
    }
  }

  /**
   * Show success message
   */
  showSuccess(message: string, title = 'Success') {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
    });
  }

  /**
   * Show info message
   */
  showInfo(message: string, title = 'Info') {
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
    });
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();
