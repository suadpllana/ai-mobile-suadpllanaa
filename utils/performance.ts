/**
 * Performance optimization utilities
 */

import { useCallback, useEffect, useRef } from 'react';

/**
 * Custom hook for creating memoized callbacks with dependencies
 * Similar to useCallback but with automatic cleanup
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const callbackRef = useRef<T>(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback, ...deps]);
  
  return useCallback((...args: any[]) => {
    return callbackRef.current(...args);
  }, []) as T;
}

/**
 * Batch multiple state updates to reduce re-renders
 */
export function batchUpdates<T>(
  updates: Array<() => void>
): void {
  updates.forEach(update => update());
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Deep equality check for objects (simple implementation)
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
    return false;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }
  
  return true;
}

/**
 * Create a cache for expensive computations
 */
export class ComputationCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number }>();
  private maxSize: number;
  private ttl: number;
  
  constructor(maxSize: number = 100, ttlMs: number = 60000) {
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }
  
  get(key: K): V | undefined {
    const cached = this.cache.get(key);
    
    if (!cached) return undefined;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return cached.value;
  }
  
  set(key: K, value: V): void {
    // Clear oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  has(key: K): boolean {
    return this.cache.has(key) && 
           (Date.now() - this.cache.get(key)!.timestamp) <= this.ttl;
  }
}

/**
 * Lazy image loader utility
 */
export const createImageLoader = () => {
  const loadedImages = new Set<string>();
  
  return {
    preload: async (urls: string[]): Promise<void> => {
      const promises = urls
        .filter(url => !loadedImages.has(url))
        .map(url => {
          return new Promise<void>((resolve) => {
            // In React Native, we can use Image.prefetch
            if (typeof Image !== 'undefined' && 'prefetch' in Image) {
              (Image as any).prefetch(url)
                .then(() => {
                  loadedImages.add(url);
                  resolve();
                })
                .catch(() => resolve()); // Fail silently
            } else {
              resolve();
            }
          });
        });
      
      await Promise.all(promises);
    },
    
    isLoaded: (url: string): boolean => {
      return loadedImages.has(url);
    },
    
    clear: (): void => {
      loadedImages.clear();
    },
  };
};

/**
 * Memory-efficient list chunking
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  
  return chunks;
}

/**
 * Async queue for sequential operations
 */
export class AsyncQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  
  async add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.process();
    });
  }
  
  private async process(): Promise<void> {
    if (this.processing) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        await operation();
      }
    }
    
    this.processing = false;
  }
  
  clear(): void {
    this.queue = [];
  }
  
  get length(): number {
    return this.queue.length;
  }
}
