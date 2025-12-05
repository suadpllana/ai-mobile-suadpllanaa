/**
 * Performance optimization utilities
 */

import { useCallback, useEffect, useRef } from 'react';

/**
 * Debounce function with cancel support
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = function (this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  } as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
  };

  return debounced;
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  } as T;
}

/**
 * Memoize expensive computations
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();

  return function (this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  } as T;
}

/**
 * Request animation frame throttle for scroll/animation handlers
 */
export function rafThrottle<T extends (...args: any[]) => any>(fn: T): T {
  let rafId: number | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (rafId !== null) return;

    rafId = requestAnimationFrame(() => {
      fn.apply(this, args);
      rafId = null;
    });
  } as T;
}

/**
 * Hook for previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

/**
 * Hook for stable callback
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * Batch updates to reduce re-renders
 */
export class BatchUpdater<T> {
  private updates: Partial<T>[] = [];
  private timeout: NodeJS.Timeout | null = null;
  private callback: (updates: Partial<T>[]) => void;

  constructor(callback: (updates: Partial<T>[]) => void, delay: number = 100) {
    this.callback = callback;
  }

  add(update: Partial<T>): void {
    this.updates.push(update);
    
    if (this.timeout) clearTimeout(this.timeout);
    
    this.timeout = setTimeout(() => {
      this.flush();
    }, 100);
  }

  flush(): void {
    if (this.updates.length > 0) {
      this.callback([...this.updates]);
      this.updates = [];
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

/**
 * Lazy load component
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retries: number = 3
): Promise<{ default: T }> {
  return new Promise((resolve, reject) => {
    componentImport()
      .then(resolve)
      .catch((error) => {
        if (retries === 0) {
          reject(error);
          return;
        }
        
        setTimeout(() => {
          lazyWithRetry(componentImport, retries - 1).then(resolve, reject);
        }, 1000);
      });
  });
}
