/**
 * Environment configuration with validation
 */

import { logger } from './logger';

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  huggingFaceApiKey?: string;
}

class EnvironmentConfig {
  private config: EnvConfig | null = null;
  
  /**
   * Initialize and validate environment variables
   */
  init(): EnvConfig {
    if (this.config) {
      return this.config;
    }
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
    const huggingFaceApiKey = process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY?.trim();
    
    // Validate required variables
    if (!supabaseUrl || !supabaseAnonKey) {
      const missing = [];
      if (!supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
      if (!supabaseAnonKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
      
      const error = `Missing required environment variables: ${missing.join(', ')}`;
      logger.error('Environment configuration error:', error);
      throw new Error(error);
    }
    
    // Validate URL format
    try {
      new URL(supabaseUrl);
    } catch {
      const error = 'EXPO_PUBLIC_SUPABASE_URL is not a valid URL';
      logger.error('Environment configuration error:', error);
      throw new Error(error);
    }
    
    // Validate key format (basic check)
    if (supabaseAnonKey.length < 20) {
      logger.warn('EXPO_PUBLIC_SUPABASE_ANON_KEY appears to be invalid (too short)');
    }
    
    this.config = {
      supabaseUrl,
      supabaseAnonKey,
      huggingFaceApiKey,
    };
    
    logger.info('Environment configuration initialized successfully');
    return this.config;
  }
  
  /**
   * Get validated environment config
   */
  getConfig(): EnvConfig {
    if (!this.config) {
      return this.init();
    }
    return this.config;
  }
  
  /**
   * Check if running in development mode
   */
  isDevelopment(): boolean {
    return __DEV__;
  }
  
  /**
   * Check if running in production mode
   */
  isProduction(): boolean {
    return !__DEV__;
  }
}

export const envConfig = new EnvironmentConfig();
