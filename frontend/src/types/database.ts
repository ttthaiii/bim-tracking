// frontend/src/types/database.ts
import { Timestamp } from 'firebase/firestore';

export interface Project {
  name: string;
  abbr: string;
  createdAt: Timestamp;
}

export interface User {
  employeeId: string; // รหัสพนักงาน
  fullNameTh: string; // ชื่อ-นามสกุล ภาษาไทย
  fullNameEn: string; // ชื่อ-นามสกุลภาษาอักฤษ
  user: string;       // สำหรับกรอก userName ระบบ Login (e.g., pongsada.p)
  password: string;   // รหัสพนักงานในการ Login (password is also employeeId)
  // Fields that might already exist or be added later, made optional for flexibility
  ตำแหน่ง?: string;
  Email?: string;
  โครงการ?: string;
}

export interface Task {
  taskName: string;
  taskAssignee: string;
  currentStep?: 'APPROVED' | 'REJECTED' | 'APPROVED_REVISION_REQUIRED' |
    'REVISION_REQUIRED' | 'Unknown' | 'APPROVED_WITH_COMMENTS' |
    'PENDING_CM_APPROVAL' | 'PENDING_REVIEW';
  taskNumber: string;
  taskCategory: string;
  projectId: string;
  planStartDate: Timestamp;
  dueDate: Timestamp;
  estWorkload: number;
  subtaskCount: number;
  subtasks?: Array<{ id: string }>;
  totalMH?: number;
  lastUpdate: Timestamp;
  startDate: Timestamp;
  endDate: Timestamp;
  progress: number;
  link?: string;
  documentNumber?: string;
  rev?: string; // เพิ่มฟิลด์ rev เข้ามา
}

export interface SubTask {
  subTaskNumber: string;
  taskName: string;
  subTaskName: string;
  internalRev: string;
  subTaskScale: 'S' | 'M' | 'L';
  subTaskAssignee: string;
  subTaskProgress: number;
  lastUpdate: Timestamp;
  startDate: Timestamp;
  endDate: Timestamp;
  mhOD: number;
  mhOT: number;
  subTaskCategory: string;
  remark?: string;
  project: string;
  subTaskFiles: Array<{
    fileName: string;
    fileUrl: string;
  }>;
}

export interface RelateWork {
  activityName: string;
  relatedWorks?: any[]; // หรือกำหนด type ที่ชัดเจนตามโครงสร้างข้อมูล
}