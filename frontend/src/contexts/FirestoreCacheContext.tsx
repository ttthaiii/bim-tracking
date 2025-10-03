'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface FirestoreCacheContextType {
  getCache: <T>(key: string) => T | null;
  setCache: <T>(key: string, data: T) => void;
  invalidateCache: (key?: string) => void;
  invalidateAll: () => void;
}

const FirestoreCacheContext = createContext<FirestoreCacheContextType | undefined>(undefined);

interface FirestoreCacheProviderProps {
  children: ReactNode;
}

export function FirestoreCacheProvider({ children }: FirestoreCacheProviderProps) {
  const [cache, setCache] = useState<Map<string, CacheEntry<any>>>(new Map());

  const getCache = useCallback(<T,>(key: string): T | null => {
    const entry = cache.get(key);
    if (!entry) return null;
    
    console.log(`✅ Cache HIT: ${key}`);
    return entry.data as T;
  }, [cache]);

  const setCacheData = useCallback(<T,>(key: string, data: T) => {
    console.log(`💾 Cache SET: ${key}`);
    setCache(prev => {
      const newCache = new Map(prev);
      newCache.set(key, {
        data,
        timestamp: Date.now()
      });
      return newCache;
    });
  }, []);

  const invalidateCache = useCallback((key?: string) => {
    if (key) {
      console.log(`🗑️ Cache INVALIDATE: ${key}`);
      setCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(key);
        return newCache;
      });
    }
  }, []);

  const invalidateAll = useCallback(() => {
    console.log('🗑️ Cache INVALIDATE ALL');
    setCache(new Map());
  }, []);

  return (
    <FirestoreCacheContext.Provider
      value={{
        getCache,
        setCache: setCacheData,
        invalidateCache,
        invalidateAll
      }}
    >
      {children}
    </FirestoreCacheContext.Provider>
  );
}

export function useFirestoreCache() {
  const context = useContext(FirestoreCacheContext);
  if (!context) {
    throw new Error('useFirestoreCache must be used within FirestoreCacheProvider');
  }
  return context;
}