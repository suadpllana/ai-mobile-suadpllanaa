/**
 * Custom hook for managing categories data
 */

import { useCallback, useEffect, useState } from 'react';
import { CategoryService } from '../services/categoryService';
import { Category } from '../types';
import { logger } from '../utils/logger';

export function useCategories(userId: string | null) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    const { data, error: err } = await CategoryService.getUserCategories(userId);

    if (err) {
      setError(err);
      logger.error('useCategories: Failed to fetch categories', err);
    } else {
      setCategories(data || []);
    }

    setLoading(false);
  }, [userId]);

  const addCategory = useCallback(async (name: string) => {
    if (!userId) throw new Error('User ID is required');

    const { data, error: err } = await CategoryService.createCategory(name, userId);

    if (err) {
      logger.error('useCategories: Failed to add category', err);
      throw err;
    }

    if (data) {
      setCategories(prev => [...prev, data]);
    }

    return data;
  }, [userId]);

  const updateCategory = useCallback(async (id: string, name: string) => {
    const { data, error: err } = await CategoryService.updateCategory(id, name);

    if (err) {
      logger.error('useCategories: Failed to update category', err);
      throw err;
    }

    if (data) {
      setCategories(prev => prev.map(cat => cat.id === id ? data : cat));
    }

    return data;
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const { error: err } = await CategoryService.deleteCategory(id);

    if (err) {
      logger.error('useCategories: Failed to delete category', err);
      throw err;
    }

    setCategories(prev => prev.filter(cat => cat.id !== id));
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    setCategories,
  };
}
