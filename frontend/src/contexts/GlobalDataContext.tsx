'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCachedProjects, getCachedTasks, getCachedSubtasks } from '@/services/cachedFirestoreService';
import { useFirestoreCache } from './FirestoreCacheContext';

interface GlobalData {
  projects: any[];
  tasks: Record<string, any[]>;
  subtasks: Record<string, any[]>;
  loading: boolean;
  refreshData: () => Promise<void>;
}

const GlobalDataContext = createContext<GlobalData>({
  projects: [],
  tasks: {},
  subtasks: {},
  loading: true,
  refreshData: async () => {},
});

export function GlobalDataProvider({ children }: { children: ReactNode }) {
  const { getCache, setCache } = useFirestoreCache();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Record<string, any[]>>({});
  const [subtasks, setSubtasks] = useState<Record<string, any[]>>({});

  const loadAllData = async () => {
    setLoading(true);
    try {
      const projectList = await getCachedProjects(getCache, setCache);
      setProjects(projectList);

      const allTasks: Record<string, any[]> = {};
      await Promise.all(
        projectList.map(async (project) => {
          const projectTasks = await getCachedTasks(project.id, getCache, setCache);
          allTasks[project.id] = projectTasks;
        })
      );
      setTasks(allTasks);

      const allSubtasks: Record<string, any[]> = {};
      await Promise.all(
        projectList.map(async (project) => {
          const projectSubtasks = await getCachedSubtasks(
            project.id,
            (allTasks[project.id] || []).map(t => t.id),
            getCache,
            setCache
          );
          allSubtasks[project.id] = projectSubtasks;
        })
      );
      setSubtasks(allSubtasks);

      setCache('allProjectData', { projects: projectList, tasks: allTasks, subtasks: allSubtasks });
    } catch (error) {
      console.error('Error loading global data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  return (
    <GlobalDataContext.Provider
      value={{
        projects,
        tasks,
        subtasks,
        loading,
        refreshData: loadAllData
      }}
    >
      {children}
    </GlobalDataContext.Provider>
  );
}

export function useGlobalData() {
  const context = useContext(GlobalDataContext);
  if (!context) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
}