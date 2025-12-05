/**
 * Custom hook for managing authentication state
 */

import { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { User } from '../types';
import { logger } from '../utils/logger';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const checkSession = useCallback(async () => {
    try {
      const { data: { session: currentSession }, error: sessionError } = 
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      setSession(currentSession);
      setUser(currentSession?.user as User || null);
    } catch (err: any) {
      setError(err);
      logger.error('useAuth: Failed to check session', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      setSession(data.session);
      setUser(data.user as User);

      return { user: data.user, session: data.session };
    } catch (err: any) {
      setError(err);
      logger.error('useAuth: Sign in failed', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata?: Record<string, any>
  ) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: metadata ? { data: metadata } : undefined,
      });

      if (signUpError) throw signUpError;

      return { user: data.user, session: data.session };
    } catch (err: any) {
      setError(err);
      logger.error('useAuth: Sign up failed', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) throw signOutError;

      setSession(null);
      setUser(null);
    } catch (err: any) {
      setError(err);
      logger.error('useAuth: Sign out failed', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string, redirectTo?: string) => {
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetError) throw resetError;
    } catch (err: any) {
      setError(err);
      logger.error('useAuth: Password reset failed', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user as User || null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [checkSession]);

  return {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refetch: checkSession,
  };
}
