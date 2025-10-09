import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { ProjectData, TaskData, SubtaskData, TaskFormData } from '@/types/task';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

class EnhancedCacheService {
  private static instance: EnhancedCacheService;
  private cache: Map<string, CacheItem<any>>;
  private readonly TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  private constructor() {
    this.cache = new Map();
  }

  public static getInstance(): EnhancedCacheService {
    if (!EnhancedCacheService.instance) {
      EnhancedCacheService.instance = new EnhancedCacheService();
    }
    return EnhancedCacheService.instance;
  }

  private generateKey(action: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('_');
    return `${action}${sortedParams ? '_' + sortedParams : ''}`;
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.TTL;
  }

  private set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item || this.isExpired(item.timestamp)) {
      this.cache.delete(key);
      return null;
    }
    return item.data as T;
  }

  // Project-related methods
  async getProjectData(projectId: string): Promise<ProjectData | null> {
    const cacheKey = this.generateKey('project', { id: projectId });
    const cached = this.get<ProjectData>(cacheKey);
    if (cached) return cached;

    const projectRef = collection(db, 'projects');
    const projectQuery = query(projectRef, where('id', '==', projectId));
    const projectSnapshot = await getDocs(projectQuery);
    
    if (!projectSnapshot.empty) {
      const projectDoc = projectSnapshot.docs[0];
      const projectData = {
        id: projectDoc.id,
        name: projectDoc.data().name,
        abbr: projectDoc.data().abbr,
        ...projectDoc.data()
      };
      this.set(cacheKey, projectData);
      return projectData;
    }
    
    return null;
  }

  async getProjectTasks(projectId: string): Promise<TaskData[]> {
    const cacheKey = this.generateKey('tasks', { projectId });
    const cached = this.get<TaskData[]>(cacheKey);
    if (cached) return cached;

    const tasksRef = collection(db, 'tasks');
    const tasksQuery = query(tasksRef, where('projectId', '==', projectId));
    const tasksSnapshot = await getDocs(tasksQuery);
    
    const tasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      taskName: doc.data().taskName,
      taskCategory: doc.data().taskCategory,
      ...doc.data()
    }));

    this.set(cacheKey, tasks);
    return tasks;
  }

  async getTaskSubtasks(taskId: string): Promise<SubtaskData[]> {
    const cacheKey = this.generateKey('subtasks', { taskId });
    const cached = this.get<SubtaskData[]>(cacheKey);
    if (cached) return cached;

    const subtasksRef = collection(db, 'tasks', taskId, 'subtasks');
    const subtasksSnapshot = await getDocs(subtasksRef);
    
    const subtasks = subtasksSnapshot.docs.map(doc => ({
      id: doc.id,
      taskId,
      ...doc.data()
    }));

    this.set(cacheKey, subtasks);
    return subtasks;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const enhancedCache = EnhancedCacheService.getInstance();