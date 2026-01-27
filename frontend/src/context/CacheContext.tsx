'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Project, Task } from '@/types/database';
import { getCachedProjects, getCachedTasks } from '@/services/cachedFirestoreService';

// ✅ Define Cache Methods
interface CacheContextType {
    projects: Project[];
    tasks: Record<string, Task[]>; // Key by projectId
    subtasks: Record<string, any[]>;   // Key by "projectId_taskId" or similar

    // Fetch Methods
    fetchProjects: (forceRefresh?: boolean) => Promise<Project[]>;
    fetchTasksForProject: (projectId: string, forceRefresh?: boolean) => Promise<Task[]>;

    // Cache Accessors (for internal service use)
    getCache: <T>(key: string) => T | null;
    setCache: <T>(key: string, data: T, ttl?: number) => void;
    invalidateCache: (keyPrefix: string) => void;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

// ✅ Simple In-Memory Cache Store with Expiry
interface CacheItem<T> {
    data: T;
    expiry: number;
}
const cacheStore: Record<string, CacheItem<any>> = {};

export const CacheProvider = ({ children }: { children: ReactNode }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Record<string, Task[]>>({});
    const [subtasks, setSubtasks] = useState<Record<string, any[]>>({});

    // ✅ 1. Low-Level Cache Getter
    const getCache = useCallback(<T,>(key: string): T | null => {
        const item = cacheStore[key];
        if (!item) return null;
        if (Date.now() > item.expiry) {
            delete cacheStore[key];
            return null;
        }
        return item.data as T;
    }, []);

    // ✅ 2. Low-Level Cache Setter
    const setCache = useCallback(<T,>(key: string, data: T, ttl: number = 5 * 60 * 1000) => {
        cacheStore[key] = {
            data,
            expiry: Date.now() + ttl
        };
    }, []);

    const invalidateCache = useCallback((keyPrefix: string) => {
        Object.keys(cacheStore).forEach(key => {
            if (key.startsWith(keyPrefix)) {
                delete cacheStore[key];
            }
        })
    }, []);

    // ✅ 3. High-Level Operations
    const fetchProjects = useCallback(async (forceRefresh = false) => {
        if (forceRefresh) invalidateCache('projects');

        // Check state first (fastest) - actually, let cachedService handle logic
        // But we need to update State context for UI reactivity
        const data = await getCachedProjects(getCache, setCache);
        setProjects(data as Project[]);
        return data as Project[];
    }, [getCache, setCache, invalidateCache]);

    const fetchTasksForProject = useCallback(async (projectId: string, forceRefresh = false) => {
        if (forceRefresh) invalidateCache(`tasks_${projectId}`);

        const data = await getCachedTasks(projectId, getCache, setCache);

        setTasks(prev => ({
            ...prev,
            [projectId]: data as Task[]
        }));
        return data as Task[];
    }, [getCache, setCache, invalidateCache]);

    // [T-053] Add fetchSubtasks support (Placeholder for now as subtasks are usually fetched via collectionGroup or subcollection directly)
    // But we need to expose invalidateCache to allowed manual triggers.

    return (
        <CacheContext.Provider value={{
            projects,
            tasks,
            subtasks,
            fetchProjects,
            fetchTasksForProject,
            getCache,
            setCache,
            invalidateCache
        }}>
            {children}
        </CacheContext.Provider>
    );
};

export const useCache = () => {
    const context = useContext(CacheContext);
    if (!context) {
        throw new Error('useCache must be used within a CacheProvider');
    }
    return context;
};
