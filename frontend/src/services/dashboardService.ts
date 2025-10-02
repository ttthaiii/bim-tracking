import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Task } from '@/types/database';

function parseDate(dateInput: any): Date {
    if (!dateInput) return new Date(NaN);

    if (dateInput instanceof Date) {
        return dateInput;
    }

    if (dateInput.toDate && typeof dateInput.toDate === 'function') {
        return dateInput.toDate();
    }

    if (typeof dateInput === 'string') {
        const thaiMonthMap: { [key: string]: number } = {
            'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3, 'พ.ค.': 4, 'มิ.ย.': 5,
            'ก.ค.': 6, 'ส.ค.': 7, 'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11
        };

        const parts = dateInput.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const monthStr = parts[1];
            const year = parseInt(parts[2], 10);

            let month = -1;
            if (thaiMonthMap[monthStr] !== undefined) {
                month = thaiMonthMap[monthStr];
            } else if (!isNaN(parseInt(monthStr, 10))) {
                month = parseInt(monthStr, 10) - 1; // JS month is 0-indexed
            }

            if (!isNaN(day) && month !== -1 && !isNaN(year)) {
                // Convert from Buddhist year if applicable
                const finalYear = year > 2500 ? year - 543 : year;
                return new Date(finalYear, month, day);
            }
        }
    }
    
    const parsedDate = new Date(dateInput);
    if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
    }

    return new Date(NaN); // Return invalid date if all parsing fails
}

export interface RecentActivity {
  id: string;
  date: Date;
  dueDate: Date;
  projectId: string;
  projectName: string;
  description: string;
  documentNumber: string;
  status: string; 
  currentStep?: string;
  subtaskCount?: number;
  totalMH?: number;
  activityType: string;
}

export async function getProjectCount() {
  const projectsRef = collection(db, 'projects');
  const snapshot = await getDocs(projectsRef);
  return snapshot.size;
}

export async function getActiveTaskCount() {
  try {
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('endDate', '==', null));
    const snapshot = await getDocs(q);
    
    const activeTasks = snapshot.docs.filter(doc => {
      const task = doc.data();
      return task.progress < 1 && task.startDate != null;
    });
    
    return activeTasks.length;
  } catch (error) {
    console.error('Error getting active task count:', error);
    return 0;
  }
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
      if (task.currentStep === 'APPROVED' || task.currentStep === 'APPROVED_WITH_COMMENTS') {
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

export async function getRecentActivities(): Promise<RecentActivity[]> {
  try {
    const tasksRef = collection(db, 'tasks');
    const snapshot = await getDocs(tasksRef);

    const projectsRef = collection(db, 'projects');
    const projectsSnapshot = await getDocs(projectsRef);
    const projectsMap = new Map();
    projectsSnapshot.forEach(doc => {
      projectsMap.set(doc.id, doc.data().name);
    });

    const activities = snapshot.docs
      .map(doc => {
        const task = doc.data() as Task;
        
        return {
          id: doc.id,
          date: parseDate(task.lastUpdate),
          dueDate: parseDate((task as any).dueDate), // Use any to bypass incorrect type
          projectId: task.projectId,
          projectName: projectsMap.get(task.projectId) || 'Unknown Project',
          activityType: 'Document Updated',
          documentNumber: task.documentNumber || '',
          status: getTaskStatusCategory(task),
          currentStep: task.currentStep,
          subtaskCount: task.subtaskCount,
          totalMH: task.totalMH,
          description: getActivityDescription(task)
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    return activities;
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return [];
  }
}

export type TaskStatusCategory = 
  | 'เสร็จสิ้น'
  | 'รออนุมัติจาก CM' 
  | 'รอตรวจสอบหน้างาน' 
  | 'รอแก้ไขแบบ BIM'
  | 'กำลังดำเนินการ-BIM'
  | 'วางแผนแล้ว-BIM'
  | 'ยังไม่วางแผน-BIM';

export interface TaskWithStatus {
  currentStep?: string;
  subtaskCount?: number;
  totalMH?: number;
}

export function getTaskStatusCategory(task: TaskWithStatus): TaskStatusCategory {
  if (task.currentStep) {
    switch (task.currentStep) {
      case 'APPROVED':
      case 'APPROVED_WITH_COMMENTS':
        return 'เสร็จสิ้น';
      case 'PENDING_CM_APPROVAL':
        return 'รออนุมัติจาก CM';
      case 'PENDING_REVIEW':
        return 'รอตรวจสอบหน้างาน';
      case 'REJECTED':
      case 'APPROVED_REVISION_REQUIRED':
      case 'REVISION_REQUIRED':
        return 'รอแก้ไขแบบ BIM';
    }
  }
  
  if (task.subtaskCount && task.subtaskCount > 1) {
    if (task.totalMH && task.totalMH > 0) {
      return 'กำลังดำเนินการ-BIM';
    }
    return 'วางแผนแล้ว-BIM';
  }
  
  if (task.subtaskCount && task.subtaskCount > 0) {
    return 'วางแผนแล้ว-BIM';
  }
  
  return 'ยังไม่วางแผน-BIM';
}

function getActivityDescription(task: Task): string {
  return task.taskName || 'ไม่ระบุชื่องาน';
}

export interface TaskDetails extends Task {
  id: string;
}

export async function getTaskDetails(projectId?: string): Promise<TaskDetails[]> {
  try {
    const tasksRef = collection(db, 'tasks');
    const q = projectId 
      ? query(tasksRef, where('projectId', '==', projectId))
      : tasksRef;
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TaskDetails[];
  } catch (error) {
    console.error('Error fetching task details:', error);
    return [];
  }
}
