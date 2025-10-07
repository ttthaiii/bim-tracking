import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export interface TaskAssignment {
  id: string;
  relateDrawing: string;
  employeeId: string;
  assignDate: string;
  time?: string;
  timeType?: 'normal' | 'ot' | 'leave';
  workingHours?: string;
  progress: string;
  note?: string;
  status: 'pending' | 'in-progress' | 'completed';
  isUploading?: boolean;
  fileUrl?: string;
  fileName?: string;
  leaveData?: {
    leaveType: string;
    startDate: string;
    endDate: string;
    leaveHours: string;
    reason: string;
  };
}

export const getEmployeeTaskAssignments = async (employeeId: string): Promise<TaskAssignment[]> => {
  try {
    const taskAssignRef = collection(db, 'taskAssign');
    const q = query(taskAssignRef, where('employeeId', '==', employeeId));
    const querySnapshot = await getDocs(q);
    
    const taskAssignments: TaskAssignment[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      taskAssignments.push({
        id: doc.id,
        relateDrawing: data.relateDrawing,
        employeeId: data.employeeId,
        assignDate: data.assignDate,
        time: data.time,
        workingHours: data.workingHours,
        progress: data.progress,
        note: data.note,
        status: data.status
      });
    });

    return allSubtasks;
  } catch (error) {
    console.error('Error fetching available subtasks:', error);
    return [];
  }
};
