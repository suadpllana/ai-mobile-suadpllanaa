/**
 * Optimized list rendering hook with virtualization
 */

import { useCallback, useMemo, useState } from 'react';

interface OptimizedListOptions<T> {
  data: T[];
  pageSize?: number;
  searchKeys?: (keyof T)[];
}

export function useOptimizedList<T>({
  data,
  pageSize = 20,
  searchKeys = [],
}: OptimizedListOptions<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery || searchKeys.length === 0) return data;

    const query = searchQuery.toLowerCase();
    return data.filter((item) =>
      searchKeys.some((key) => {
        const value = item[key];
        return String(value).toLowerCase().includes(query);
      })
    );
  }, [data, searchQuery, searchKeys]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(0, end);
  }, [filteredData, currentPage, pageSize]);

  // Calculate metrics
  const hasMore = paginatedData.length < filteredData.length;
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Load more data
  const loadMore = useCallback(() => {
    if (hasMore) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasMore]);

  // Reset pagination
  const reset = useCallback(() => {
    setCurrentPage(1);
    setSearchQuery('');
  }, []);

  // Update search
  const updateSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on search
  }, []);

  return {
    data: paginatedData,
    searchQuery,
    updateSearch,
    loadMore,
    reset,
    hasMore,
    currentPage,
    totalPages,
    totalItems: filteredData.length,
  };
}
