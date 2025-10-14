// frontend/src/types/task.ts

// เราจะลบ Task ออกจาก import นี้เพื่อไม่ให้สับสน
import { Project, Subtask } from './database';

// 1. เปลี่ยนชื่อ interface จาก Task เป็น TaskEntry
export interface TaskEntry {
  subtaskId: string;
  relateDrawing: string;
  activity: string;
  relateWork: string;
  internalRev: number;
  workScale: number;
  assignee: string;
  deadline: string;
  progress: number;
  linkFile?: string;
  isCorrect: boolean;
}

// 2. แก้ไข TaskFormData ให้ใช้ชื่อใหม่ (TaskEntry)
export interface TaskFormData extends Omit<TaskEntry, 'subtaskId' | 'progress' | 'isCorrect'> {
  projectName: string;
}