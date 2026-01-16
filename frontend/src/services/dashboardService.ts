import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Task } from '@/types/database';

export const STATUS_COLORS: Record<TaskStatusCategory, string> = {
  'เสร็จสิ้น': 'rgba(16, 185, 129, 0.8)',
  'รออนุมัติจาก CM': 'rgba(239, 68, 68, 0.8)',
  'รอตรวจสอบหน้างาน': 'rgba(245, 158, 11, 0.8)',
  'รอแก้ไขแบบ BIM': 'rgba(249, 115, 22, 0.8)',
  'กำลังดำเนินการ-BIM': 'rgba(211, 211, 211, 0.8)',
  'วางแผนแล้ว-BIM': 'rgba(169, 169, 169, 0.8)',
  'ยังไม่วางแผน-BIM': 'rgba(105, 105, 105, 0.8)',
};

// สร้างและ export STATUS_CATEGORIES จาก keys ของ STATUS_COLORS
export const STATUS_CATEGORIES = Object.keys(STATUS_COLORS) as TaskStatusCategory[];

// สร้างและ export interface สำหรับข้อมูล Dashboard
export interface DashboardStats {
  projectCount: number;
  activeTaskCount: number;
  teamMemberCount: number;
  completionRate: number;
  documentStatus: Record<TaskStatusCategory, number>; // key คือชื่อ status, value คือจำนวน
  totalDocuments: number;
}

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
  revNo?: string; // เพิ่มฟิลด์ revNo เข้ามาใน RecentActivity
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

export async function getDashboardStats(projectId?: string): Promise<DashboardStats> {
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

    // Initialize document status counter
    const documentStatus = {} as Record<TaskStatusCategory, number>;
    STATUS_CATEGORIES.forEach(cat => documentStatus[cat] = 0);

    let completedTasks = 0;
    snapshot.forEach(doc => {
      const task = doc.data() as Task;
      const status = getTaskStatusCategory(task);
      if (documentStatus[status] !== undefined) {
        documentStatus[status]++;
      }
      if (status === 'เสร็จสิ้น') {
        completedTasks++;
      }
    });

    const totalTasks = snapshot.size;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      projectCount,
      activeTaskCount,
      teamMemberCount,
      completionRate: Math.round(completionRate),
      documentStatus,
      totalDocuments: totalTasks,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Return a default structure on error
    const documentStatus = {} as Record<TaskStatusCategory, number>;
    STATUS_CATEGORIES.forEach(cat => documentStatus[cat] = 0);
    return {
      projectCount: 0,
      activeTaskCount: 0,
      teamMemberCount: 0,
      completionRate: 0,
      documentStatus,
      totalDocuments: 0,
    };
  }
}

export async function getRecentActivities(limit?: number): Promise<RecentActivity[]> {
  try {
    const tasksRef = collection(db, 'tasks');
    const snapshot = await getDocs(tasksRef);

    const projectsRef = collection(db, 'projects');
    const projectsSnapshot = await getDocs(projectsRef);
    const projectsMap = new Map();
    projectsSnapshot.forEach(doc => {
      projectsMap.set(doc.id, doc.data().name);
    });

    let activities = snapshot.docs
      .map(doc => {
        const task = doc.data() as Task;

        // 2. แก้ไข object ที่ return ให้เรียกใช้ property ได้โดยตรง
        return {
          id: doc.id,
          date: parseDate(task.lastUpdate), // เอา (task as any) ออก
          dueDate: parseDate(task.dueDate), // แก้ให้ตรงกับ property ที่มีอยู่
          projectId: task.projectId,
          projectName: projectsMap.get(task.projectId) || 'Unknown Project',
          activityType: 'Document Updated',
          documentNumber: task.documentNumber || '',
          status: getTaskStatusCategory(task),
          currentStep: task.currentStep,
          subtaskCount: task.subtaskCount,   // เอา (task as any) ออก
          totalMH: task.totalMH,             // เอา (task as any) ออก
          description: getActivityDescription(task),
          revNo: task.rev || ''
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    if (limit) {
      activities = activities.slice(0, limit);
    }
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

// ------------------------------------------------------------------
// Daily Report Dashboard Aggregation
// ------------------------------------------------------------------

import { collectionGroup } from 'firebase/firestore';

export interface DailyReportSummary {
  id: string; // employeeId-date
  employeeId: string;
  fullName: string;
  date: Date;
  totalWorkingHours: number; // in hours
  totalOT: number; // in hours
  status: 'Normal' | 'Abnormal' | 'Holiday' | 'Missing';
}

function parseTime(timeStr?: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) + ((minutes || 0) / 60);
}

export async function getAllDailyReportEntries(
  startDate?: Date,
  endDate?: Date,
  assignee?: string
): Promise<DailyReportSummary[]> {
  try {
    const reportGroupRef = collectionGroup(db, 'dailyReport');
    // Note: collectionGroup queries with where clauses might require a composite index.
    // We will fetch all and filter client-side for now to avoid blocking on index creation,
    // assuming the total number of dailyReport docs isn't massive yet.
    // Optimally, we would use query(reportGroupRef, where('date', '>=', start), ...) if we had meaningful fields on the doc itself.

    let q = query(reportGroupRef);
    if (assignee) {
      q = query(reportGroupRef, where('employeeId', '==', assignee));
    }

    const snapshot = await getDocs(q);
    const summaryMap = new Map<string, DailyReportSummary>();

    // Helper to get summary or create new
    const getSummary = (empId: string, dateStr: string, dateObj: Date) => {
      const key = `${empId}-${dateStr}`;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          id: key,
          employeeId: empId,
          fullName: empId, // Placeholder, will need to join with User data if possible or client will handle mapping
          date: dateObj,
          totalWorkingHours: 0,
          totalOT: 0,
          status: 'Normal'
        });
      }
      return summaryMap.get(key)!;
    };

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const employeeId = data.employeeId;
      if (!employeeId) return;

      const workhours = Array.isArray(data.workhours) ? data.workhours : [];

      workhours.forEach((log: any) => {
        // Determine Date
        let logDate: Date | null = null;
        if (log.assignDate) {
          // assignDate is YYYY-MM-DD
          logDate = new Date(log.assignDate);
        } else if (log.loggedAt?.toDate) {
          logDate = log.loggedAt.toDate();
        } else if (log.timestamp?.toDate) {
          logDate = log.timestamp.toDate();
        }

        if (!logDate) return;

        // Filter by Date Range
        // Set time to 0 to compare dates only
        const checkDate = new Date(logDate);
        checkDate.setHours(0, 0, 0, 0);

        if (startDate) {
          startDate.setHours(0, 0, 0, 0);
          if (checkDate < startDate) return;
        }
        if (endDate) {
          endDate.setHours(0, 0, 0, 0);
          if (checkDate > endDate) return;
        }

        const dateStr = checkDate.toISOString().split('T')[0];
        const summary = getSummary(employeeId, dateStr, checkDate);

        // Aggregate Hours (using string 00:00 format logic from daily-report page)
        // Assuming data is stored as object { day: number, ot: number } in workhours based on taskAssignService
        // Wait, taskAssignService saves day/ot as numbers (e.g. 1.5)

        const workingHours = typeof log.day === 'number' ? log.day : 0;
        const otHours = typeof log.ot === 'number' ? log.ot : 0;

        summary.totalWorkingHours += workingHours;
        summary.totalOT += otHours;
      });
    });

    return Array.from(summaryMap.values()).map(summary => {
      // Determine Status
      const dayOfWeek = summary.date.getDay(); // 0 is Sunday
      let status: 'Normal' | 'Abnormal' | 'Holiday' = 'Normal';

      if (dayOfWeek === 0) {
        status = 'Holiday';
      } else if (summary.totalWorkingHours < 8) {
        status = 'Abnormal';
      } else {
        status = 'Normal';
      }

      return { ...summary, status };
    }).sort((a, b) => b.date.getTime() - a.date.getTime()); // Newest first

  } catch (error) {
    console.error('Error fetching aggregated daily reports:', error);
    return [];
  }
}