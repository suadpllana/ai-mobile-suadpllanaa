/**
 * Validation utility functions
 */

import { VALIDATION } from './constants';
import { sanitizeInput, validateSecurePassword } from './security';

export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  const sanitized = sanitizeInput(email);
  return VALIDATION.emailRegex.test(String(sanitized).toLowerCase());
};

export const validatePassword = (password: string): { 
  isValid: boolean; 
  error?: string 
} => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  // Use secure password validation for sign-up
  const secureValidation = validateSecurePassword(password);
  if (!secureValidation.isValid) {
    return { 
      isValid: false, 
      error: secureValidation.errors[0] // Return first error
    };
  }
  
  return { isValid: true };
};

/**
 * Basic password validation for sign-in (less strict)
 */
export const validatePasswordSignIn = (password: string): { 
  isValid: boolean; 
  error?: string 
} => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  if (password.length < VALIDATION.minPasswordLength) {
    return { 
      isValid: false, 
      error: `Password must be at least ${VALIDATION.minPasswordLength} characters` 
    };
  }
  return { isValid: true };
};

export const validatePhoneNumber = (phone: string): {
  isValid: boolean;
  error?: string;
} => {
  if (!phone) {
    return { isValid: true }; // Phone is optional
  }
  
  const cleaned = phone.trim();
  if (cleaned.length < 10) {
    return { isValid: false, error: 'Phone number too short' };
  }
  
  if (!VALIDATION.phoneRegex.test(cleaned)) {
    return { isValid: false, error: 'Invalid phone number format' };
  }
  
  return { isValid: true };
};

export const validatePasswordMatch = (
  password: string, 
  confirmPassword: string
): { isValid: boolean; error?: string } => {
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }
  return { isValid: true };
};

export const validateRequiredFields = (
  fields: Record<string, any>
): { isValid: boolean; error?: string } => {
  for (const [key, value] of Object.entries(fields)) {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return { isValid: false, error: `${key} is required` };
    }
  }
  return { isValid: true };
};
