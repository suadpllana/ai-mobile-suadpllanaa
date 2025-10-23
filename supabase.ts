import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';

const supabaseUrl = 'https://jbgbmqtlystnbenudlwb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiZ2JtcXRseXN0bmJlbnVkbHdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NTI2MDEsImV4cCI6MjA3NjUyODYwMX0.3WhCUC56-xBlIQIvpwIIk4rP4JRr_X0Y70_yHA7XFPs';

const localStorage = {
  getItem: async (key: string) => {
    return Promise.resolve(window.localStorage.getItem(key));
  }
  ,
  setItem: async (key: string, value: string) => {
    window.localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: async (key: string) => {
    window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};



export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? localStorage : AsyncStorage, // Use localStorage for web
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});