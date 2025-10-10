import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

export const generateCacheKey = (collectionName: string, filters?: Record<string, any>): string => {
  if (!filters) return collectionName;
  const filterStr = Object.entries(filters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('_');
  return `${collectionName}_${filterStr}`;
};

// ✅ โค้ดใหม่ - เรียบง่ายขึ้น
export async function cachedQuery<T>(
  cacheKey: string,
  getCache: <T>(key: string) => T | null,
  setCache: <T>(key: string, data: T, ttl?: number) => void,
  queryFn: () => Promise<T>,
  ttl?: number // ⬅️ เพิ่ม TTL parameter
): Promise<T> {
  // ✅ ตรวจสอบ Cache ก่อน
  const cached = getCache<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // ✅ ถ้าไม่มี Cache → ดึงข้อมูลจาก Firestore
  console.log(`🔍 Firestore Query: ${cacheKey}`);
  const data = await queryFn();
  
  // ✅ บันทึกลง Cache พร้อม TTL
  setCache(cacheKey, data, ttl);
  
  return data;
}

// ✅ โค้ดใหม่
export async function getCachedProjects(
  getCache: <T>(key: string) => T | null,
  setCache: <T>(key: string, data: T, ttl?: number) => void
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
    },
    30 * 60 * 1000 // ⬅️ TTL = 30 นาที (Projects ไม่ค่อยเปลี่ยน)
  );
}

// ✅ โค้ดใหม่
export async function getCachedTasks(
  projectId: string,
  getCache: <T>(key: string) => T | null,
  setCache: <T>(key: string, data: T, ttl?: number) => void
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
    },
    10 * 60 * 1000 // ⬅️ TTL = 10 นาที (Tasks เปลี่ยนบ้าง)
  );
}

// ✅ โค้ดใหม่
export async function getCachedSubtasks(
  projectId: string,
  taskIds: string[],
  getCache: <T>(key: string) => T | null,
  setCache: <T>(key: string, data: T, ttl?: number) => void
) {
  const cacheKey = generateCacheKey('subtasks', { projectId });
  
  return cachedQuery(
    cacheKey,
    getCache,
    setCache,
    async () => {
      const allSubtasks: any[] = [];
      
      // ✅ ใช้ Promise.all แทน for loop เพื่อความเร็ว
      await Promise.all(
        taskIds.map(async (taskId) => {
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
              endDate: data.endDate,
              subTaskFiles: data.subTaskFiles || null
            });
          });
        })
      );
      
      return allSubtasks;
    },
    5 * 60 * 1000 // ⬅️ TTL = 5 นาที (Subtasks เปลี่ยนบ่อย)
  );
}

// ✅ โค้ดใหม่
export async function getCachedRelateWorks(
  activityName: string,
  getCache: <T>(key: string) => T | null,
  setCache: <T>(key: string, data: T, ttl?: number) => void
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
    },
    60 * 60 * 1000 // ⬅️ TTL = 60 นาที (RelateWorks แทบไม่เปลี่ยน)
  );
}