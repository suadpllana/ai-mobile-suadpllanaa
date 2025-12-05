/**
 * Example tests for bookService
 */

import { bookService } from '../../services/bookService';
import { supabase } from '../../supabase';

jest.mock('../../supabase');

describe('BookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserBooks', () => {
    it('fetches user books successfully', async () => {
      const mockBooks = [
        { id: '1', title: 'Book 1', author: 'Author 1', user_id: 'user-1' },
        { id: '2', title: 'Book 2', author: 'Author 2', user_id: 'user-1' },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockBooks, error: null }),
      });

      const result = await bookService.getUserBooks('user-1');

      expect(result.data).toEqual(mockBooks);
      expect(result.error).toBeNull();
    });

    it('handles errors when fetching books', async () => {
      const mockError = new Error('Database error');

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: mockError }),
      });

      const result = await bookService.getUserBooks('user-1');

      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError);
    });
  });

  describe('createBook', () => {
    it('creates a book successfully', async () => {
      const newBook = {
        title: 'New Book',
        author: 'New Author',
        user_id: 'user-1',
      };

      const createdBook = { ...newBook, id: '3' };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: createdBook, error: null }),
      });

      const result = await bookService.createBook(newBook);

      expect(result.data).toEqual(createdBook);
      expect(result.error).toBeNull();
    });
  });

  describe('updateBook', () => {
    it('updates a book successfully', async () => {
      const updates = { title: 'Updated Title' };
      const updatedBook = { id: '1', title: 'Updated Title', author: 'Author 1' };

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updatedBook, error: null }),
      });

      const result = await bookService.updateBook('1', updates);

      expect(result.data).toEqual(updatedBook);
      expect(result.error).toBeNull();
    });
  });

  describe('deleteBook', () => {
    it('deletes a book successfully', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await bookService.deleteBook('1');

      expect(result.error).toBeNull();
    });
  });
});
