import { db } from '../config/firebase';
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