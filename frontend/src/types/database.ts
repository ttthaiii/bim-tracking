import { Timestamp } from 'firebase/firestore';

export interface Project {
  name: string;
  abbr: string;
  createdAt: Timestamp;
}

export interface User {
  Name: string;
  ตำแหน่ง: string;
  Email: string;
  โครงการ: string;
  Password: string;
  รหัสพนักงาน: string;
}

export interface Task {
  taskName: string;
  taskAssignee: string;
  taskNumber: string;
  taskCategory: string;
  projectId: string;
  planStartDate: Timestamp;
  dueDate: Timestamp;
  estWorkload: number;
  subtaskCount: number;
  lastUpdate: Timestamp;
  startDate: Timestamp;
  endDate: Timestamp;
  totalMH: number;
  progress: number;
  link?: string;
  documentNumber?: string;
  rev?: string;
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