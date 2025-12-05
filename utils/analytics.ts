/**
 * Analytics tracking utilities
 */

import { logger } from './logger';

type EventProperties = Record<string, string | number | boolean>;

class Analytics {
  private enabled: boolean = !__DEV__;
  private queue: Array<{ event: string; properties: EventProperties; timestamp: number }> = [];

  /**
   * Track a custom event
   */
  trackEvent(eventName: string, properties?: EventProperties): void {
    if (!this.enabled) {
      logger.debug(`[Analytics] ${eventName}`, properties);
      return;
    }

    this.queue.push({
      event: eventName,
      properties: properties || {},
      timestamp: Date.now(),
    });

    this.flush();
  }

  /**
   * Track screen view
   */
  trackScreenView(screenName: string, properties?: EventProperties): void {
    this.trackEvent('screen_view', {
      screen_name: screenName,
      ...properties,
    });
  }

  /**
   * Track user action
   */
  trackUserAction(action: string, target: string, properties?: EventProperties): void {
    this.trackEvent('user_action', {
      action,
      target,
      ...properties,
    });
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: string): void {
    this.trackEvent('error', {
      error_message: error.message,
      error_stack: error.stack || '',
      context: context || 'unknown',
    });
  }

  /**
   * Track performance metric
   */
  trackPerformance(metric: string, value: number, unit: string = 'ms'): void {
    this.trackEvent('performance', {
      metric,
      value,
      unit,
    });
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: EventProperties): void {
    if (!this.enabled) return;

    logger.debug('[Analytics] Set user properties', properties);
    // Implement with your analytics provider
  }

  /**
   * Flush events to analytics service
   */
  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      // Implement with your analytics provider (Firebase, Amplitude, etc.)
      logger.debug('[Analytics] Flushing events', events);
    } catch (error) {
      logger.error('[Analytics] Failed to flush events', error);
      // Re-add to queue on failure
      this.queue.unshift(...events);
    }
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

export const analytics = new Analytics();

// Convenience exports
export const trackEvent = analytics.trackEvent.bind(analytics);
export const trackScreenView = analytics.trackScreenView.bind(analytics);
export const trackUserAction = analytics.trackUserAction.bind(analytics);
export const trackError = analytics.trackError.bind(analytics);
export const trackPerformance = analytics.trackPerformance.bind(analytics);
