import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export interface Task {
  id: string;
  relateDrawing: string;
  time?: string;
  workingHours?: string;
  progress: string;
  note?: string;
  employeeId: string;
}

export const getTasksByEmployeeId = async (employeeId: string): Promise<Task[]> => {
  try {
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('employeeId', '==', employeeId));
    const querySnapshot = await getDocs(q);

    const tasks: Task[] = [];
    querySnapshot.forEach((doc) => {
      const taskData = doc.data() as Omit<Task, 'id'>;
      tasks.push({
        ...taskData,
        id: doc.id
      });
    });

    return tasks;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
};

/**
 * [T-021] Check if a task has associated daily report entries.
 * Used to prevent deletion of tasks that are already referenced.
 */
import { collectionGroup } from 'firebase/firestore';

export const checkTaskHasDailyReports = async (taskId: string): Promise<boolean> => {
  try {
    // Note: DailyReportEntry usually stores subtaskId, but some might store taskId.
    // However, the most reliable check is via Subtasks.
    // If we only have taskId, we should ideally check all subtasks of this task.
    // But for a quick check, let's see if any report references this taskId directly (if schema supports)
    // OR if we can query by subtasks.

    // Strategy: Since DailyReport references subtaskId, and we are deleting a Task (which contains subtasks),
    // we strictly should check if ANY of its subtasks are used.
    // But getting all subtask IDs first might be expensive.
    // Alternative: The Requirement implies "used in Daily Report".

    // Let's rely on checking if any 'dailyReport' document exists that links to this task/subtask.
    // Since our DailyReport schema relies on Subtasks, we might need to check subtasks first.

    // For now, let's check recursively or check known fields.
    // If the system stores 'taskId' in DailyReport, we query that.
    // Based on database.ts, DailyReportEntry DOES NOT guaranteed store 'taskId' for query (it has subtaskId).
    // So correct approach: Block Task deletion if it has Subtasks that are used.

    // Step 1: Get all subtasks of this task
    const subtasksRef = collection(db, 'tasks', taskId, 'subtasks');
    const subtasksSnapshot = await getDocs(subtasksRef);

    if (subtasksSnapshot.empty) return false;

    // Step 2: Check each subtask efficiently. 
    // Optimization: We can't do 'IN' query with > 10 items easily across collectionGroup without correct index.
    // Let's loop (checking 20 subtasks is okay).

    const checks = subtasksSnapshot.docs.map(async (doc) => {
      return checkSubtaskHasDailyReports(doc.id);
    });

    const results = await Promise.all(checks);
    return results.some(hasReport => hasReport);

  } catch (error) {
    console.error('Error checking task usage:', error);
    // Fail safe: If error, assume valuable data might exist, block delete.
    return true;
  }
};

export const checkSubtaskHasDailyReports = async (subtaskId: string): Promise<boolean> => {
  try {
    // [T-028] Normalize subtaskId to uppercase for comparison
    const normalizedSubtaskId = subtaskId.toUpperCase();

    // Query collectionGroup 'dailyReport' where subtaskId matches
    const reportsQuery = query(
      collectionGroup(db, 'dailyReport'),
      where('subtaskId', '==', normalizedSubtaskId)
    );

    // We only need to know if ONE exists
    const snapshot = await getDocs(reportsQuery);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking subtask usage:', error);
    return true; // Fail safe
  }
};