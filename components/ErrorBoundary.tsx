/**
 * Enhanced Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * Includes retry logic and better error reporting
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary caught an error', error, errorInfo);
    
    this.setState({ errorInfo });
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // In production, send to error tracking service
    if (!__DEV__) {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleReset = (): void => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      logger.warn('Max retry attempts reached');
      return;
    }
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { maxRetries = 3 } = this.props;
      const canRetry = this.state.retryCount < maxRetries;

      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>⚠️ Something went wrong</Text>
            <Text style={styles.message}>
              We're sorry for the inconvenience. The app encountered an unexpected error.
            </Text>
            
            {canRetry && (
              <Text style={styles.retryInfo}>
                Retry attempts: {this.state.retryCount} / {maxRetries}
              </Text>
            )}
            
            {__DEV__ && this.state.error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Error Details:</Text>
                <Text style={styles.errorDetails}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.errorStack}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}
            
            {canRetry ? (
              <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                <Text style={styles.buttonText}>🔄 Try Again</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.maxRetriesContainer}>
                <Text style={styles.maxRetriesText}>
                  Max retry attempts reached. Please restart the app.
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  retryInfo: {
    fontSize: 14,
    color: '#888',
    marginBottom: 15,
  },
  errorContainer: {
    backgroundColor: '#2a2a3e',
    padding: 15,
    borderRadius: 8,
    marginVertical: 20,
    maxWidth: '100%',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 10,
  },
  errorDetails: {
    fontSize: 12,
    color: '#ff8787',
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  errorStack: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  maxRetriesContainer: {
    backgroundColor: '#3a2a2e',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  maxRetriesText: {
    fontSize: 14,
    color: '#ff6b6b',
    textAlign: 'center',
  },
});
