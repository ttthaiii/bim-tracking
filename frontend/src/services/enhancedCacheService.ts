import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Project, Task, Subtask } from '@/types/database';
import { TaskFormData } from '@/types/task';

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

  // --- Project-related methods ---
  // แก้ไข: เปลี่ยน ProjectData -> Project
  async getProjectData(projectId: string): Promise<Project | null> {
    const cacheKey = this.generateKey('project', { id: projectId });
    const cached = this.get<Project>(cacheKey);
    if (cached) return cached;

    // แก้ไข: ใช้ getDoc เพื่อประสิทธิภาพที่ดีกว่า
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (projectDoc.exists()) {
      const projectData = { id: projectDoc.id, ...projectDoc.data() } as Project;
      this.set(cacheKey, projectData);
      return projectData;
    }
    
    return null;
  }

  // แก้ไข: เปลี่ยน TaskData -> Task
  async getProjectTasks(projectId: string): Promise<Task[]> {
    const cacheKey = this.generateKey('tasks', { projectId });
    const cached = this.get<Task[]>(cacheKey);
    if (cached) return cached;

    const tasksRef = collection(db, 'tasks');
    const tasksQuery = query(tasksRef, where('projectId', '==', projectId));
    const tasksSnapshot = await getDocs(tasksQuery);
    
    const tasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Task[];

    this.set(cacheKey, tasks);
    return tasks;
  }

  // แก้ไข: เปลี่ยน SubtaskData -> Subtask
  async getTaskSubtasks(taskId: string): Promise<Subtask[]> {
    const cacheKey = this.generateKey('subtasks', { taskId });
    const cached = this.get<Subtask[]>(cacheKey);
    if (cached) return cached;

    const subtasksRef = collection(db, 'tasks', taskId, 'subtasks');
    const subtasksSnapshot = await getDocs(subtasksRef);
    
    const subtasks = subtasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Subtask[];

    this.set(cacheKey, subtasks);
    return subtasks;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const enhancedCache = EnhancedCacheService.getInstance();