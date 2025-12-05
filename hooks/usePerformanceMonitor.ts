/**
 * Performance monitoring hook
 */

import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { logger } from '../utils/logger';

interface PerformanceMetrics {
  renderTime: number;
  mountTime: number;
  interactionTime: number;
}

export function usePerformanceMonitor(componentName: string) {
  const mountTime = useRef<number>(Date.now());
  const renderCount = useRef<number>(0);
  const renderTimes = useRef<number[]>([]);

  useEffect(() => {
    const startTime = Date.now();
    renderCount.current += 1;

    return () => {
      const renderTime = Date.now() - startTime;
      renderTimes.current.push(renderTime);

      // Log slow renders
      if (renderTime > 100) {
        logger.warn(`Slow render in ${componentName}: ${renderTime}ms`);
      }
    };
  });

  useEffect(() => {
    const totalMountTime = Date.now() - mountTime.current;

    InteractionManager.runAfterInteractions(() => {
      const interactionTime = Date.now() - mountTime.current;
      
      const metrics: PerformanceMetrics = {
        renderTime: renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length || 0,
        mountTime: totalMountTime,
        interactionTime,
      };

      if (totalMountTime > 500) {
        logger.warn(`Slow mount in ${componentName}:`, metrics);
      }

      // Log to analytics in production
      if (__DEV__) {
        logger.debug(`Performance metrics for ${componentName}:`, metrics);
      }
    });
  }, [componentName]);

  const measureAsync = async <T,>(name: string, fn: () => Promise<T>): Promise<T> => {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      logger.debug(`${componentName}.${name} took ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error(`${componentName}.${name} failed after ${duration}ms`, error);
      throw error;
    }
  };

  return { measureAsync, renderCount: renderCount.current };
}
