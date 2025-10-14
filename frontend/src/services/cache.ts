// frontend/src/services/cache.ts

// แก้ไข: import ชื่อฟังก์ชันโดยตรงโดยไม่ใช้ alias เพื่อความชัดเจน
import { getProjectDetails, getTasksForProject, getSubtasksForTask } from './firebase';
import { Project, Task, Subtask } from '@/types/database';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private ttl: number; // Time to live in milliseconds

  constructor(ttl = 5 * 60 * 1000) { // Default cache time: 5 minutes
    this.ttl = ttl;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    const isExpired = (Date.now() - entry.timestamp) > this.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    this.cache.set(key, entry);
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // --- Project Data ---
  async getProjectData(projectId: string, forceRefresh = false): Promise<Project | null> {
    const key = `project_${projectId}`;
    if (!forceRefresh) {
      const cached = this.get<Project>(key);
      if (cached) return cached;
    }

    const projects = await getProjectDetails();
    // แก้ไข: เพิ่ม Type (p: Project) เพื่อให้ TypeScript รู้จัก
    const data = projects.find((p: Project) => p.id === projectId);

    if (!data) {
      return null; // คืนค่า null ถ้าไม่เจอโปรเจกต์
    }
    this.set(key, data);
    return data;
  }

  // --- Task Data ---
  async getProjectTasks(projectId: string, forceRefresh = false): Promise<Task[]> {
    const key = `tasks_for_project_${projectId}`;
    if (!forceRefresh) {
      const cached = this.get<Task[]>(key);
      if (cached) return cached;
    }

    const rawTasks = await getTasksForProject(projectId);
    // แก้ไข: เพิ่ม Type (task: Task) เพื่อให้ TypeScript รู้จัก
    const tasks = rawTasks.map((task: Task) => ({
      ...task,
    })) as Task[];

    this.set(key, tasks);
    return tasks;
  }

  // --- Subtask Data ---
  async getTaskSubtasks(projectId: string, taskId: string, forceRefresh = false): Promise<Subtask[]> {
    const key = `subtasks_for_task_${taskId}`;
    if (!forceRefresh) {
      const cached = this.get<Subtask[]>(key);
      if (cached) return cached;
    }

    const rawSubtasks = await getSubtasksForTask(projectId, taskId);
    // แก้ไข: เพิ่ม Type (subtask: Subtask) เพื่อให้ TypeScript รู้จัก
    const subtasks = rawSubtasks.map((subtask: Subtask) => ({
      ...subtask,
    })) as Subtask[];
    
    this.set(key, subtasks);
    return subtasks;
  }
}

export const cacheService = new CacheService();