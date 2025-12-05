/**
 * Advanced offline storage hook with sync capabilities
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { logger } from '../utils/logger';

interface OfflineStorageOptions<T> {
  key: string;
  initialValue: T;
  syncInterval?: number;
  onSync?: (data: T) => Promise<void>;
}

export function useOfflineStorage<T>({
  key,
  initialValue,
  syncInterval = 5000,
  onSync,
}: OfflineStorageOptions<T>) {
  const [data, setData] = useState<T>(initialValue);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Load from storage on mount
  useEffect(() => {
    loadFromStorage();
  }, [key]);

  // Auto-sync when online
  useEffect(() => {
    if (!isOnline || !onSync) return;

    const interval = setInterval(async () => {
      await syncToServer();
    }, syncInterval);

    return () => clearInterval(interval);
  }, [isOnline, data, onSync, syncInterval]);

  const loadFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        setData(JSON.parse(stored));
      }
    } catch (error) {
      logger.error(`Failed to load ${key} from storage`, error);
    }
  };

  const saveToStorage = async (newData: T) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(newData));
      setData(newData);
    } catch (error) {
      logger.error(`Failed to save ${key} to storage`, error);
      throw error;
    }
  };

  const syncToServer = async () => {
    if (!onSync || isSyncing) return;

    setIsSyncing(true);
    try {
      await onSync(data);
      setLastSyncTime(new Date());
    } catch (error) {
      logger.error(`Failed to sync ${key}`, error);
    } finally {
      setIsSyncing(false);
    }
  };

  const clearStorage = async () => {
    try {
      await AsyncStorage.removeItem(key);
      setData(initialValue);
    } catch (error) {
      logger.error(`Failed to clear ${key}`, error);
    }
  };

  return {
    data,
    setData: saveToStorage,
    isOnline,
    isSyncing,
    lastSyncTime,
    syncNow: syncToServer,
    clear: clearStorage,
  };
}
