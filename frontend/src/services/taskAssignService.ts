import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export interface TaskAssignment {
  id: string;
  relateDrawing: string;
  employeeId: string;
  assignDate: string;
  workingHours?: string;
  overtimeHours?: string;
  progress: string;
  note?: string;
  status: 'pending' | 'in-progress' | 'completed';
  isUploading?: boolean;
  fileUrl?: string;
  fileName?: string;
  isLeaveRow?: boolean;
  leaveType?: 'sick' | 'personal' | 'vacation' | 'other';
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
        workingHours: data.workingHours,
        overtimeHours: data.overtimeHours,
        progress: data.progress,
        note: data.note,
        status: data.status
      });
    });
    
    // Sort by assignDate
    taskAssignments.sort((a, b) => new Date(b.assignDate).getTime() - new Date(a.assignDate).getTime());
    
    return taskAssignments;
  } catch (error) {
    console.error('Error fetching task assignments:', error);
    return [];
  }
};