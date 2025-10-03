import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export interface TaskAssignment {
  id: string;
  relateDrawing: string;
  employeeId: string;
  assignDate: string;
  // Removed time?: string; as per request
  timeType?: 'normal' | 'ot' | 'leave';
  // Removed workingHours?: string; as per request
  normalWorkingHours?: string; // New field for normal working hours
  otWorkingHours?: string;     // New field for OT working hours
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
        // time: data.time, // Removed
        timeType: data.timeType || 'normal', // Default to 'normal'
        normalWorkingHours: data.normalWorkingHours || '', // Initialize new fields
        otWorkingHours: data.otWorkingHours || '',
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