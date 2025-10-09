'use client';

import React, { createContext, useContext, useCallback, useRef, useMemo, ReactNode } from 'react';

// ✅ โค้ดใหม่
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds (optional)
}

// ✅ โค้ดใหม่
interface FirestoreCacheContextType {
  getCache: <T>(key: string) => T | null;
  setCache: <T>(key: string, data: T, ttl?: number) => void;
  invalidateCache: (key?: string) => void;
  invalidateAll: () => void;
  hasCache: (key: string) => boolean;
}

const FirestoreCacheContext = createContext<FirestoreCacheContextType | undefined>(undefined);

interface FirestoreCacheProviderProps {
  children: ReactNode;
}

// ✅ โค้ดใหม่
export function FirestoreCacheProvider({ children }: FirestoreCacheProviderProps) {
  // ✅ ใช้ useRef แทน useState เพื่อป้องกัน Re-render
  const cacheRef = useRef<Map<string, CacheEntry<any>>>(new Map());

// ✅ โค้ดใหม่
  const getCache = useCallback(<T,>(key: string): T | null => {
    const entry = cacheRef.current.get(key);
    
    if (!entry) {
      return null;
    }

    // ✅ ตรวจสอบ TTL (ถ้ามี)
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      console.log(`🗑️ Cache EXPIRED: ${key}`);
      cacheRef.current.delete(key);
      return null;
    }

    console.log(`✅ Cache HIT: ${key}`);
    return entry.data as T;
  }, []); // ⬅️ Empty deps = Never recreate

// ✅ โค้ดใหม่
  const setCache = useCallback(<T,>(key: string, data: T, ttl?: number) => {
    console.log(`💾 Cache SET: ${key}${ttl ? ` (TTL: ${ttl}ms)` : ''}`);
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }, []);

// ✅ โค้ดใหม่
  const invalidateCache = useCallback((key?: string) => {
    if (key) {
      console.log(`🗑️ Cache INVALIDATE: ${key}`);
      cacheRef.current.delete(key);
    }
  }, []);

// ✅ โค้ดใหม่
  const invalidateAll = useCallback(() => {
    console.log('🗑️ Cache INVALIDATE ALL');
    cacheRef.current.clear();
  }, []);

  // ✅ เพิ่มใหม่
  const hasCache = useCallback((key: string): boolean => {
    return cacheRef.current.has(key);
  }, []);

// ✅ โค้ดใหม่
  // ✅ ใช้ useMemo เพื่อให้ value object stable
  const value = useMemo(
    () => ({
      getCache,
      setCache,
      invalidateCache,
      invalidateAll,
      hasCache
    }),
    [getCache, setCache, invalidateCache, invalidateAll, hasCache]
  );

  return (
    <FirestoreCacheContext.Provider value={value}>
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