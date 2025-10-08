import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

// 🆕 เพิ่ม Rate Limiting
let cacheCallCount = 0;
const MAX_CACHE_CALLS_PER_SECOND = 20;
let lastResetTime = Date.now();

export const generateCacheKey = (collectionName: string, filters?: Record<string, any>): string => {
  if (!filters) return collectionName;
  const filterStr = Object.entries(filters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('_');
  return `${collectionName}_${filterStr}`;
};

export async function cachedQuery<T>(
  cacheKey: string,
  getCache: <T>(key: string) => T | null,
  setCache: <T>(key: string, data: T) => void,
  queryFn: () => Promise<T>
): Promise<T> {
  // 🆕 Rate Limiting
  const now = Date.now();
  if (now - lastResetTime > 1000) {
    cacheCallCount = 0;
    lastResetTime = now;
  }
  
  cacheCallCount++;
  
  if (cacheCallCount > MAX_CACHE_CALLS_PER_SECOND) {
    console.warn(`⚠️ Cache call rate limit reached (${cacheCallCount} calls/sec)`);
  }

  const cached = getCache<T>(cacheKey);
  if (cached !== null) {
    console.log(`✅ Cache HIT: ${cacheKey}`); // 🆕 เพิ่ม log
    return cached;
  }

  console.log(`🔍 Firestore Query: ${cacheKey}`);
  const data = await queryFn();
  setCache(cacheKey, data);
  return data;
}

export async function getCachedProjects(
  getCache: <T>(key: string) => T | null,
  setCache: <T>(key: string, data: T) => void
) {
  const cacheKey = 'projects';
  
  return cachedQuery(
    cacheKey,
    getCache,
    setCache,
    async () => {
      const projectsRef = collection(db, 'projects');
      const snapshot = await getDocs(projectsRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || '',
        abbr: doc.data().abbr || ''
      }));
    }
  );
}

export async function getCachedTasks(
  projectId: string,
  getCache: <T>(key: string) => T | null,
  setCache: <T>(key: string, data: T) => void
) {
  const cacheKey = generateCacheKey('tasks', { projectId });
  
  return cachedQuery(
    cacheKey,
    getCache,
    setCache,
    async () => {
      const tasksCol = collection(db, 'tasks');
      const q = query(tasksCol, where('projectId', '==', projectId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        taskName: doc.data().taskName || '',
        taskCategory: doc.data().taskCategory || ''
      }));
    }
  );
}

export async function getCachedSubtasks(
  projectId: string,
  taskIds: string[],
  getCache: <T>(key: string) => T | null,
  setCache: <T>(key: string, data: T) => void
) {
  const cacheKey = generateCacheKey('subtasks', { projectId });
  
  return cachedQuery(
    cacheKey,
    getCache,
    setCache,
    async () => {
      const allSubtasks: any[] = [];
      
      for (const taskId of taskIds) {
        const subtasksCol = collection(db, 'tasks', taskId, 'subtasks');
        const subtasksSnapshot = await getDocs(subtasksCol);
        
        subtasksSnapshot.docs.forEach(subtaskDoc => {
          const data = subtaskDoc.data();
          allSubtasks.push({
            id: subtaskDoc.id,
            subTaskNumber: data.subTaskNumber || '',
            taskName: data.taskName || '',
            subTaskCategory: data.subTaskCategory || '',
            item: data.item || '',
            internalRev: data.internalRev || '',
            subTaskScale: data.subTaskScale || '',
            subTaskAssignee: data.subTaskAssignee || '',
            subTaskProgress: data.subTaskProgress || 0,
            startDate: data.startDate,
            endDate: data.endDate
          });
        });
      }
      
      return allSubtasks;
    }
  );
}

export async function getCachedRelateWorks(
  activityName: string,
  getCache: <T>(key: string) => T | null,
  setCache: <T>(key: string, data: T) => void
) {
  const cacheKey = generateCacheKey('relateWorks', { activityName });
  
  return cachedQuery(
    cacheKey,
    getCache,
    setCache,
    async () => {
      const relateWorksCol = collection(db, 'relateWorks');
      const q = query(relateWorksCol, where('activityName', '==', activityName));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return [];
      
      const doc = snapshot.docs[0];
      const data = doc.data();
      const relatedWorks = data.relatedWorks || {};
      
      return Object.values(relatedWorks)
        .map((work: any) => ({
          value: work,
          label: work
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
  );
}