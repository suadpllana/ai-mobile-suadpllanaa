/**
 * Centralized Supabase service layer for category operations
 */

import { supabase } from '../supabase';
import { ApiResponse, Category } from '../types';
import { DEFAULT_CATEGORIES } from '../utils/constants';
import { logger } from '../utils/logger';

export class CategoryService {
  /**
   * Fetch all categories for a user
   */
  static async getUserCategories(userId: string): Promise<ApiResponse<Category[]>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      logger.error('CategoryService.getUserCategories failed', error);
      return { data: null, error };
    }
  }

  /**
   * Create a new category
   */
  static async createCategory(name: string, userId: string): Promise<ApiResponse<Category>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name, user_id: userId }])
        .select('*')
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      logger.error('CategoryService.createCategory failed', error);
      return { data: null, error };
    }
  }

  /**
   * Update a category
   */
  static async updateCategory(id: string, name: string): Promise<ApiResponse<Category>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      logger.error('CategoryService.updateCategory failed', error);
      return { data: null, error };
    }
  }

  /**
   * Delete a category
   */
  static async deleteCategory(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error: any) {
      logger.error('CategoryService.deleteCategory failed', error);
      return { data: null, error };
    }
  }

  /**
   * Create default categories for a new user
   */
  static async createDefaultCategories(userId: string): Promise<ApiResponse<void>> {
    try {
      const categories = Array.from(DEFAULT_CATEGORIES).map(name => ({ 
        name, 
        user_id: userId 
      }));
      
      const { error } = await supabase.from('categories').insert(categories);
      if (error) throw error;

      return { data: null, error: null };
    } catch (error: any) {
      logger.error('CategoryService.createDefaultCategories failed', error);
      return { data: null, error };
    }
  }

  /**
   * Find or create a category by name
   */
  static async findOrCreateCategory(
    name: string, 
    userId: string
  ): Promise<ApiResponse<Category>> {
    try {
      // Try to find existing category
      const { data: existing } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .eq('name', name)
        .maybeSingle();

      if (existing) {
        return { data: existing, error: null };
      }

      // Create new category
      return await this.createCategory(name, userId);
    } catch (error: any) {
      logger.error('CategoryService.findOrCreateCategory failed', error);
      return { data: null, error };
    }
  }
}
