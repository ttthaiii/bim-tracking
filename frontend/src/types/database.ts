import { Timestamp } from "firebase/firestore";

export interface Project {
  id: string;
  name: string;
  abbr: string;
  status: string;
  description?: string;
  startDate?: Timestamp;
  dueDate?: Timestamp;
}

export interface Task {
  id: string;
  projectId: string;
  taskName: string;
  taskCategory: string;
  status: string;
  planStartDate?: Timestamp;
  dueDate?: Timestamp;
  assignedTo?: string[];
  currentStep?: string;
  lastRev?: string;
  documentNumber?: string;
  rev?: string;
}

// Interface for Subtask (from tasks > subtasks collection)
export interface Subtask {
  id: string; // Document ID of the subtask
  path?: string; // Full path to the subtask document
  endDate: Timestamp | null;
  internalRev: string;
  item: string;
  lastUpdate: Timestamp;
  mhOD: number;
  mhOT: number;
  project: string; // Project ID
  remark: string;
  startDate: Timestamp;
  subTaskAssignee: string;
  subTaskCategory: string;
  subTaskFiles: string[];
  subTaskName: string;
  subTaskNumber: string;
  subTaskProgress: number;
  subTaskScale: string;
  taskName: string;
  wlFromscale: number;
  wlRemaining: number;
}

// Interface for DailyReportEntry (UI state representation)
export interface DailyReportEntry {
  id: string; // Unique ID for the row in the UI
  employeeId: string;
  assignDate: string; 
  subtaskId: string; 
  subtaskPath?: string; // Full path to the selected subtask document
  normalWorkingHours: string;
  otWorkingHours: string;
  progress: string;
  note?: string;
  status: 'pending' | 'in-progress' | 'completed';
  
  // Fields copied from Subtask for convenience
  subTaskName: string;
  subTaskCategory: string;
  internalRev?: string; 
  subTaskScale?: string;
  project?: string;
  taskName?: string;
  remark?: string;
  item?: string;
}

export interface User {
  employeeId: string;
  fullName: string;
  fullNameEn?: string;
  password?: string; 
  role: string;
  username: string;
}

export interface Employee {
  employeeId: string;
  fullName: string;
}
