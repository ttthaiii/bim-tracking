import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Task } from '@/types/database';
import { fetchAvailableSubtasksForEmployee } from './taskAssignService';

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
  /* [T-002-E1-1] Filter deleted projects */
  const projectsRef = collection(db, 'projects');
  const snapshot = await getDocs(projectsRef);

  const activeProjects = snapshot.docs.filter(doc => {
    const data = doc.data();
    return (data.status || '').toLowerCase() !== 'deleted';
  });

  return activeProjects.length;
}

export async function getActiveTaskCount() {
  try {
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('endDate', '==', null));
    const snapshot = await getDocs(q);

    const activeTasks = snapshot.docs.filter(doc => {
      const task = doc.data();
      // [T-002-E1-1] Filter deleted tasks
      const isDeleted = (task.status || '').toLowerCase() === 'deleted' ||
        (task.taskStatus || '').toLowerCase() === 'deleted';

      return !isDeleted && task.progress < 1 && task.startDate != null;
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

      // [T-002-E1-1] Filter deleted tasks
      const isDeleted = (task.status || '').toLowerCase() === 'deleted' ||
        (task.taskStatus || '').toLowerCase() === 'deleted';
      if (isDeleted) return;

      const status = getTaskStatusCategory(task);
      if (documentStatus[status] !== undefined) {
        documentStatus[status]++;
      }
      if (status === 'เสร็จสิ้น') {
        completedTasks++;
      }
    });

    // [T-002-E1-1] Calculate total tasks excluding deleted ones
    const totalTasks = Object.values(documentStatus).reduce((a, b) => a + b, 0);
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
      .filter(doc => {
        const task = doc.data() as Task;
        return (task.status || '').toLowerCase() !== 'deleted' &&
          (task.taskStatus || '').toLowerCase() !== 'deleted';
      })
      .map(doc => {
        const task = doc.data() as Task;
        return {
          id: doc.id,
          date: parseDate(task.lastUpdate),
          dueDate: parseDate(task.dueDate),
          projectId: task.projectId,
          projectName: projectsMap.get(task.projectId) || 'Unknown Project',
          activityType: 'Document Updated',
          documentNumber: task.documentNumber || '',
          status: getTaskStatusCategory(task),
          currentStep: task.currentStep,
          subtaskCount: task.subtaskCount,
          totalMH: task.totalMH,
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

export function isTaskDeleted(task: Partial<Task> | Partial<TaskWithStatus>): boolean {
  const taskStatus = (task as any).taskStatus;
  const legacyStatus = (task as any).status;
  return (taskStatus || '').toString().toLowerCase() === 'deleted' ||
    (legacyStatus || '').toString().toLowerCase() === 'deleted';
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
    }))
      .filter((t: any) => {
        // [T-002-E1-1] Filter deleted tasks
        return (t.status || '').toLowerCase() !== 'deleted' &&
          (t.taskStatus || '').toLowerCase() !== 'deleted';
      }) as TaskDetails[];
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
  totalLeaveHours: number; // [T-025] New: Track hours specifically for Leave tasks
  status: 'Normal' | 'Abnormal' | 'Holiday' | 'Missing' | 'Future' | 'Leave';
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
    const summaryMap = new Map<string, DailyReportSummary & { hasLeaveTask: boolean; hasNonLeaveTask: boolean }>();

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
          totalLeaveHours: 0,
          status: 'Normal',
          hasLeaveTask: false,
          hasNonLeaveTask: false
        });
      }
      return summaryMap.get(key)!;
    };

    // [T-003-EX-23] Whitelist Strategy: Fetch VALID subtasks for the assignee
    // This catches both Soft Deletes (taskStatus='deleted') and Hard Deletes (doc missing)
    let validSubtaskIds: Set<string> | null = null;
    if (assignee) {
      // Optimization: Only run whitelist check if filtering by specific assignee
      const validSubtasks = await fetchAvailableSubtasksForEmployee(assignee);
      // [T-028] Normalize subtask IDs to uppercase for Set comparison
      validSubtaskIds = new Set(validSubtasks.map(s => s.id?.toUpperCase()));
    }

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const employeeId = data.employeeId;
      if (!employeeId) return;

      const workhours = Array.isArray(data.workhours) ? data.workhours : [];

      // Deduplicate logs within this subtask by date (Keep latest only)
      const latestLogsByDate = new Map<string, any>();

      workhours.forEach((log: any) => {
        // [T-003-EX-23] Exclude orphan data (Whitelist Check)
        // If we have a whitelist (assignee selected), allow ONLY if subtaskId is in it.
        // If no whitelist (view all), we skip this check for performance.
        // Check for Leave Task (Bypass Whitelist)
        const taskName = (log.taskName || data.taskName || '').toLowerCase();
        const subTaskName = (log.subTaskName || data.subTaskName || '').toLowerCase();
        const category = (log.subTaskCategory || data.subTaskCategory || '').toLowerCase();

        // [T-024] Strict Leave Detection (Task Name)
        // User Requirement: Catch "Task" = "ลางาน" (Leave). Do not rely on Subtask (e.g. "ลากิจ").
        const isLeaveLog =
          taskName.includes('ลางาน') ||
          taskName.includes('leave') ||
          category.includes('ลางาน') ||
          category.includes('leave');
        // Note: purposefully excluding subTaskName check if strictly following "Catch Task" instruction, 
        // but keeping it is generally safer for legacy data. 
        // However, based on "Catch Task... without caring about Subtask", 
        // we prioritized TaskName. I will keep subTaskName as fallback but remove specific subtypes.

        const isLeaveLogFinal = isLeaveLog || subTaskName.includes('ลางาน') || subTaskName.includes('leave');

        if (validSubtaskIds) {
          const rawSubtaskId = log.subtaskId || data.subtaskId;
          // [T-028] Normalize subtaskId to uppercase for comparison
          const logSubtaskId = rawSubtaskId?.toUpperCase();
          // If subtaskId is MISSING or NOT in whitelist, skip it (Treat as Orphan)
          // UNLESS it is a Leave task (we always want to show leave)
          if ((!logSubtaskId || !validSubtaskIds.has(logSubtaskId)) && !isLeaveLogFinal) {
            return;
          }
        }

        // Resolve Date
        let logDate: Date | null = null;
        let dateStr = '';
        if (log.assignDate) {
          dateStr = log.assignDate; // YYYY-MM-DD
          const parts = dateStr.split('-').map(Number);
          logDate = new Date(parts[0], parts[1] - 1, parts[2]);
        } else if (log.loggedAt?.toDate) {
          logDate = log.loggedAt.toDate();
          // Fix: Use local time for date string to match logDate
          const y = logDate!.getFullYear();
          const m = String(logDate!.getMonth() + 1).padStart(2, '0');
          const d = String(logDate!.getDate()).padStart(2, '0');
          dateStr = `${y}-${m}-${d}`;
        } else if (log.timestamp?.toDate) {
          logDate = log.timestamp.toDate();
          // Fix: Use local time for date string to match logDate
          const y = logDate!.getFullYear();
          const m = String(logDate!.getMonth() + 1).padStart(2, '0');
          const d = String(logDate!.getDate()).padStart(2, '0');
          dateStr = `${y}-${m}-${d}`;
        }

        if (!dateStr || !logDate) return;

        // Compare Timestamps
        const currentTimestamp = log.timestamp?.toMillis ? log.timestamp.toMillis() :
          (log.timestamp?.getTime ? log.timestamp.getTime() : 0);

        const existing = latestLogsByDate.get(dateStr);
        if (!existing || currentTimestamp > existing.timestamp) {
          latestLogsByDate.set(dateStr, { log, dateObj: logDate, timestamp: currentTimestamp });
        }
      });

      // Aggregate only the latest logs
      latestLogsByDate.forEach((value, dateStr) => {
        const { log, dateObj } = value;
        const checkDate = new Date(dateObj);
        checkDate.setHours(0, 0, 0, 0);

        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          if (checkDate < s) return;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(0, 0, 0, 0);
          if (checkDate > e) return;
        }

        const summary = getSummary(employeeId, dateStr, checkDate);


        const workingHours = typeof log.day === 'number' ? log.day : 0;
        const otHours = typeof log.ot === 'number' ? log.ot : 0;

        summary.totalWorkingHours += workingHours;
        summary.totalOT += otHours;

        // [T-025] Strict Leave Detection Logic
        // Check keywords in taskName ONLY
        const taskName = (log.taskName || data.taskName || '').toLowerCase();

        // Strict check for "ลางาน" or "Leave" in Task Name
        const isLeave = taskName.includes('ลางาน') || taskName.includes('leave');

        if (isLeave) {
          summary.hasLeaveTask = true;
          summary.totalLeaveHours += workingHours;
        } else {
          // Note: If not strict leave, we count as non-leave for mixed day detection if needed,
          // though T-025 mainly cares about totalLeaveHours == 8
          summary.hasNonLeaveTask = true;
        }
      });
    });

    const now = new Date();
    // Reset time part of 'now' to ensure clean comparison with dateObj (which is 00:00:00)
    now.setHours(0, 0, 0, 0);

    return Array.from(summaryMap.values()).map(summary => {
      // Determine Status
      const dayOfWeek = summary.date.getDay(); // 0 is Sunday
      let status: 'Normal' | 'Abnormal' | 'Holiday' | 'Future' | 'Leave' = 'Normal';


      // [T-022] Future Date Logic
      if (summary.date > now) {
        status = 'Future';
      } else if (dayOfWeek === 0) {
        status = 'Holiday';
      } else {
        // [T-025] New Status Determination Priority

        // 1. Check strict Leave (Total Leave Hours MUST be 8)
        if (summary.totalLeaveHours === 8) {
          status = 'Leave' as any;
        }
        // 2. Check Abnormal (Total Working Hours < 8)
        else if (summary.totalWorkingHours < 8) {
          status = 'Abnormal';
        }
        // 3. Normal (Total >= 8 and not pure leave)
        else {
          status = 'Normal';
        }
      }

      return {
        id: summary.id,
        employeeId: summary.employeeId,
        fullName: summary.fullName,
        date: summary.date,
        totalWorkingHours: summary.totalWorkingHours,
        totalOT: summary.totalOT,
        totalLeaveHours: summary.totalLeaveHours,
        status: status as any
      };
    }).sort((a, b) => b.date.getTime() - a.date.getTime()); // Newest first

  } catch (error) {
    console.error('Error fetching aggregated daily reports:', error);
    return [];
  }
}
