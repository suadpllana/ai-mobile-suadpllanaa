/**
 * Security utility functions for input sanitization and validation
 */

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .slice(0, 5000); // Limit length
};

/**
 * Sanitize SQL-like search queries to prevent injection
 */
export const sanitizeSearchQuery = (query: string): string => {
  if (!query) return '';
  
  return query
    .trim()
    .replace(/['";\\]/g, '') // Remove SQL special characters
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comments
    .slice(0, 200); // Limit search query length
};

/**
 * Validate and sanitize URL to prevent malicious redirects
 */
export const sanitizeUrl = (url: string): string | null => {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
};

/**
 * Rate limiting helper - tracks API call timestamps
 */
export class RateLimiter {
  private callTimestamps: Map<string, number[]> = new Map();
  
  constructor(
    private maxCalls: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  /**
   * Check if the action is rate limited
   * @param key - Unique identifier (e.g., userId)
   * @returns true if allowed, false if rate limited
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const timestamps = this.callTimestamps.get(key) || [];
    
    // Filter out old timestamps outside the window
    const recentCalls = timestamps.filter(ts => now - ts < this.windowMs);
    
    if (recentCalls.length >= this.maxCalls) {
      return false;
    }
    
    // Add current timestamp
    recentCalls.push(now);
    this.callTimestamps.set(key, recentCalls);
    
    return true;
  }
  
  /**
   * Clear rate limit for a key
   */
  clear(key: string): void {
    this.callTimestamps.delete(key);
  }
}

/**
 * Validate environment variables on app start
 */
export const validateEnvVars = (): { isValid: boolean; missing: string[] } => {
  const required = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ];
  
  const missing = required.filter(key => {
    const value = process.env[key];
    return !value || value.trim() === '';
  });
  
  return {
    isValid: missing.length === 0,
    missing,
  };
};

/**
 * Secure password validation with comprehensive checks
 */
export const validateSecurePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Prevent timing attacks in string comparison
 */
export const secureCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
};
