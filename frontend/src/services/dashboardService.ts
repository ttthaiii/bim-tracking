import { collection, getDocs, query, where, limit, Timestamp } from 'firebase/firestore';

// Helper function to get timestamp in milliseconds
function getTimestamp(date: any): number {
  if (!date) return 0;
  
  // If it's a Firestore Timestamp
  if (date instanceof Timestamp) {
    return date.toDate().getTime();
  }
  
  // If it's a JavaScript Date
  if (date instanceof Date) {
    return date.getTime();
  }
  
  // If it's a number (timestamp in milliseconds)
  if (typeof date === 'number') {
    return date;
  }
  
  console.warn('Unknown date format:', date);
  return 0;
}
import { db } from '@/config/firebase';
import { Project, Task, SubTask } from '@/types/database';

// Basic stats for home page
export async function getProjectCount() {
  const projectsRef = collection(db, 'projects');
  const snapshot = await getDocs(projectsRef);
  return snapshot.size;
}

export async function getActiveTaskCount() {
  const tasksRef = collection(db, 'tasks');
  const q = query(tasksRef, where('endDate', '==', null));
  const snapshot = await getDocs(q);
  return snapshot.size;
}

export async function getTeamMemberCount() {
  const usersRef = collection(db, 'DB_Login');
  const snapshot = await getDocs(usersRef);
  return snapshot.size;
}

export async function getDashboardStats(projectId?: string) {
  try {
    const [projectCount, activeTaskCount, teamMemberCount] = await Promise.all([
      getProjectCount(),
      getActiveTaskCount(),
      getTeamMemberCount()
    ]);

    // คำนวณ Completion Rate
    const tasksRef = collection(db, 'tasks');
    const q = projectId 
      ? query(tasksRef, where('projectId', '==', projectId))
      : tasksRef;
    const snapshot = await getDocs(q);
    
    let totalTasks = 0;
    let completedTasks = 0;
    snapshot.forEach(doc => {
      const task = doc.data() as Task;
      totalTasks++;
      if (task.progress === 1) {
        completedTasks++;
      }
    });

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      projectCount,
      activeTaskCount,
      teamMemberCount,
      completionRate: Math.round(completionRate)
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      projectCount: 0,
      activeTaskCount: 0,
      teamMemberCount: 0,
      completionRate: 0
    };
  }
}

// Interface สำหรับ Recent Activity
export interface RecentActivity {
  id: string;
  date: Date;
  projectId: string;
  projectName: string;
  activityType: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  description: string;
}

export async function getRecentActivities(limit: number = 5): Promise<RecentActivity[]> {
  try {
    console.log("Starting to fetch recent activities...");

    // 1. ดึงข้อมูล tasks
    const tasksRef = collection(db, 'tasks');
    console.log("Tasks collection reference created");

    const snapshot = await getDocs(tasksRef);
    console.log(`Fetched ${snapshot.size} tasks`);

    // แปลงเป็น array และเรียงตามวันที่ล่าสุด
    const allDocs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log("All tasks data:", allDocs);

    const sortedDocs = snapshot.docs
      .map(doc => {
        const data = doc.data();
        console.log("Processing task:", doc.id, data);
        return {
          doc,
          lastUpdate: data.lastUpdate
        };
      })
      .sort((a, b) => {
        console.log("Comparing dates:", {
          a: a.lastUpdate,
          b: b.lastUpdate
        });
        
        const aTime = getTimestamp(a.lastUpdate);
        const bTime = getTimestamp(b.lastUpdate);
        
        console.log("Converted timestamps:", { aTime, bTime });
        return bTime - aTime;
      })
      .map(item => item.doc)
      .slice(0, limit);

    console.log("Sorted and limited docs:", sortedDocs.map(doc => ({
      id: doc.id,
      lastUpdate: doc.data().lastUpdate
    }))); // จำกัดจำนวนรายการตาม limit

    // 2. ดึงข้อมูลโครงการทั้งหมดเพื่อใช้อ้างอิงชื่อโครงการ
    const projectsRef = collection(db, 'projects');
    const projectsSnapshot = await getDocs(projectsRef);
    const projectsMap = new Map();
    projectsSnapshot.forEach(doc => {
      const project = doc.data();
      projectsMap.set(doc.id, project.name);
    });

    // 3. แปลงข้อมูล tasks เป็น activities
    const activities: RecentActivity[] = [];
    sortedDocs.forEach(doc => {
      const task = doc.data() as Task;
      activities.push({
        id: doc.id,
        date: task.lastUpdate?.toDate?.() 
          ? task.lastUpdate.toDate() 
          : task.lastUpdate instanceof Date 
          ? task.lastUpdate 
          : new Date(),
        projectId: task.projectId,
        projectName: projectsMap.get(task.projectId) || task.projectId,
        activityType: 'Document Updated',
        status: task.progress === 1 
          ? 'completed' 
          : task.progress > 0 
          ? 'in_progress'
          : 'pending',
        description: getActivityDescription(task)
      });
    });

    // เรียงลำดับตามวันที่ล่าสุด
    return activities.sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return [];
  }
}

function getActivityDescription(task: Task): string {
  if (task.progress === 1) {
    return `Completed task: ${task.taskName}`;
  } else if (task.progress > 0) {
    return `Updated progress (${Math.round(task.progress * 100)}%) - ${task.taskName}`;
  } else if (task.startDate) {
    return `Started task: ${task.taskName}`;
  } else {
    return `Created task: ${task.taskName}`;
  }
}

// Document tracking dashboard
export interface TaskStatusCount {
  CM: number;
  BIM: number;
  SITE: number;
  อนุมัติ: number;
  total: number;
}

export interface ProjectTaskSummary {
  projectName: string;
  taskCounts: TaskStatusCount;
}

export async function getTasksByStatus(): Promise<ProjectTaskSummary[]> {
  try {
    const tasksRef = collection(db, 'tasks');
    const snapshot = await getDocs(tasksRef);
    const projectTasks = new Map<string, TaskStatusCount>();

    snapshot.forEach((doc) => {
      const task = doc.data() as Task;
      const projectId = task.projectId;

      if (!projectTasks.has(projectId)) {
        projectTasks.set(projectId, {
          CM: 0,
          BIM: 0,
          SITE: 0,
          อนุมัติ: 0,
          total: 0
        });
      }

      const counts = projectTasks.get(projectId)!;
      counts.total++;

      // Increment counter based on task category
      if (task.taskCategory?.includes('CM')) {
        counts.CM++;
      } else if (task.taskCategory?.includes('BIM')) {
        counts.BIM++;
      } else if (task.taskCategory?.includes('SITE')) {
        counts.SITE++;
      }

      // Check if task is approved
      if (task.progress === 1) {
        counts.อนุมัติ++;
      }
    });

    // Convert Map to array of ProjectTaskSummary
    const summaries: ProjectTaskSummary[] = [];
    for (const [projectId, counts] of projectTasks.entries()) {
      summaries.push({
        projectName: projectId,
        taskCounts: counts
      });
    }

    return summaries;
  } catch (error) {
    console.error('Error fetching task status:', error);
    return [];
  }
}

export async function getTaskDetails(projectId?: string) {
  try {
    const tasksRef = collection(db, 'tasks');
    const q = projectId 
      ? query(tasksRef, where('projectId', '==', projectId))
      : tasksRef;
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as (Task & { id: string })[];
  } catch (error) {
    console.error('Error fetching task details:', error);
    return [];
  }
}

export async function getSubtasksByTaskId(taskId: string) {
  try {
    const subtasksRef = collection(db, 'tasks', taskId, 'subtasks');
    const snapshot = await getDocs(subtasksRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as (SubTask & { id: string })[];
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    return [];
  }
}