import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { ProjectData, TaskData, SubtaskData } from '@/types/task';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  ttl: number;
  maxSize?: number;
}

class CacheService {
  private cache: Map<string, CacheItem<any>>;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.config = config;
  }

  private generateKey(projectId: string, type: string, params?: Record<string, any>): string {
    const base = `${projectId}:${type}`;
    if (!params) return base;
    
    const paramString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('_');
    
    return `${base}_${paramString}`;
  }

  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() > item.expiresAt;
  }

  private set<T>(key: string, data: T): void {
    const timestamp = Date.now();
    const expiresAt = timestamp + this.config.ttl;
    
    this.cache.set(key, {
      data,
      timestamp,
      expiresAt
    });

    if (this.config.maxSize && this.cache.size > this.config.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
  }

  private get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item || this.isExpired(item)) {
      if (item) this.cache.delete(key);
      return null;
    }
    return item.data as T;
  }

  async getProjectData(projectId: string, forceRefresh = false): Promise<ProjectData> {
    const key = this.generateKey(projectId, 'project-data');
    
    if (!forceRefresh) {
      const cached = this.get<ProjectData>(key);
      if (cached) return cached;
    }

    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }

    const projectData = {
      id: projectId,
      ...projectDoc.data()
    } as ProjectData;

    this.set(key, projectData);
    return projectData;
  }

  async getProjectTasks(projectId: string, forceRefresh = false): Promise<TaskData[]> {
    const key = this.generateKey(projectId, 'tasks');
    
    if (!forceRefresh) {
      const cached = this.get<TaskData[]>(key);
      if (cached) return cached;
    }

    const tasksRef = collection(db, 'tasks');
    const tasksQuery = query(tasksRef, where('projectId', '==', projectId));
    const snapshot = await getDocs(tasksQuery);
    
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TaskData[];

    this.set(key, tasks);
    return tasks;
  }

  async getTaskSubtasks(projectId: string, taskId: string, forceRefresh = false): Promise<SubtaskData[]> {
    const key = this.generateKey(projectId, 'subtasks', { taskId });
    
    if (!forceRefresh) {
      const cached = this.get<SubtaskData[]>(key);
      if (cached) return cached;
    }

    const subtasksRef = collection(db, 'subtasks');
    const subtasksQuery = query(
      subtasksRef,
      where('projectId', '==', projectId),
      where('taskId', '==', taskId)
    );
    const snapshot = await getDocs(subtasksQuery);
    
    const subtasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SubtaskData[];

    this.set(key, subtasks);
    return subtasks;
  }

  clearProjectCache(projectId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${projectId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  clearAllCache(): void {
    this.cache.clear();
  }
}

const cache = new CacheService({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100 // Maximum 100 items in cache
});

export default cache;
