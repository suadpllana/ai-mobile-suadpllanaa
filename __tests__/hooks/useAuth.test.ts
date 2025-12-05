/**
 * Example tests for useAuth hook
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../supabase';

jest.mock('../../supabase');

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('checks session on mount', async () => {
    const mockSession = {
      user: { id: 'user-1', email: 'test@example.com' },
      access_token: 'token',
    };

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockSession.user);
  });

  it('signs in successfully', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    const mockSession = { user: mockUser, access_token: 'token' };

    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(async () => {
      const response = await result.current.signIn('test@example.com', 'password');
      expect(response.user).toEqual(mockUser);
    });
  });

  it('handles sign in error', async () => {
    const mockError = new Error('Invalid credentials');

    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: mockError,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(async () => {
      try {
        await result.current.signIn('test@example.com', 'wrong-password');
      } catch (error) {
        expect(error).toEqual(mockError);
      }
    });
  });

  it('signs out successfully', async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth());

    await waitFor(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });
});
