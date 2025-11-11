// supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// -------------------------------------------------------------------
// 1. Supabase credentials (Expo env variables)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// -------------------------------------------------------------------
// 2. Storage that satisfies Supabase's `Storage` interface
type SupabaseStorage = Parameters<typeof createClient>[2]['auth']['storage'];

const nativeStorage: SupabaseStorage = AsyncStorage;

// Web storage – only accessed when `Platform.OS === 'web'`
const webStorage: SupabaseStorage = {
  getItem: (key: any) => {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem: (key: any, value: any) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: any) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  },
};

// -------------------------------------------------------------------
// 3. Choose the right storage at runtime
const storage: SupabaseStorage = Platform.OS === 'web' ? webStorage : nativeStorage;

// -------------------------------------------------------------------
// 4. Create the client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
});