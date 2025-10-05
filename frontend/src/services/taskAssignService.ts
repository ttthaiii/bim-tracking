import { db } from '@/config/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

interface Project {
  abbr: string;
  projectId: string;
}

interface Task {
  taskNumber: string;
  taskName: string;
  taskCategory: string;
  projectId: string;
  assignee: string;
  subtasks?: {
    subTaskName: string;
    subTaskAssignee: string;
    subTaskProgress: number;
    item: string;
  }[];
}

interface TaskData {
  taskName: string;
  taskCategory: string;
  projectId: string;
  assignee: string;
}

export async function getRelateDrawingOptions(fullName: string): Promise<{ value: string; label: string; }[]> {
  try {
    const tasksRef = collection(db, 'tasks');
    const tasksSnap = await getDocs(tasksRef);
    
    // Get unique tasks assigned to the user
    const uniqueTasks = new Map<string, Task>();
    
    tasksSnap.docs.forEach(doc => {
      const data = doc.data() as Task;
      if (data.assignee === fullName && !uniqueTasks.has(data.taskName)) {
        uniqueTasks.set(data.taskName, {
          taskNumber: doc.id,
          taskName: data.taskName,
          taskCategory: data.taskCategory,
          projectId: data.projectId,
          assignee: data.assignee
        });
      }
    });

    // Convert Map values to array
    const tasks = Array.from(uniqueTasks.values());

    // Get subtasks from each task document
    const options: { value: string; label: string; }[] = [];
    
    for (const task of tasks) {
      // Get subtasks subcollection for each task
      const subtasksRef = collection(db, 'tasks', task.taskNumber, 'subtasks');
      const subtasksSnap = await getDocs(subtasksRef);
      
      subtasksSnap.docs.forEach(subtaskDoc => {
        const subtaskData = subtaskDoc.data();
        
        // Check if subtask is assigned to this user and not completed
        if (subtaskData.subTaskAssignee === fullName && 
            (subtaskData.subTaskProgress || 0) < 100) {
          
          // Extract project abbreviation from taskNumber
          const parts = task.taskNumber.split('_');
          const abbr = parts[0].split('-')[1]; // Gets "AS" from "ART-AS-Built"
          
          // Use taskCategory for better organization
          const value = `${abbr}_${task.taskCategory}_${subtaskData.subTaskName}_${subtaskDoc.id}`;
          options.push({
            value,
            label: value
          });
        }
      });
    }

    // Sort options alphabetically
    options.sort((a, b) => a.label.localeCompare(b.label));

    // Add leave options at the end
    const leaveOptions = [
      { value: 'ลาป่วย', label: 'ลาป่วย' },
      { value: 'ลากิจ', label: 'ลากิจ' },
      { value: 'ลาพักร้อน', label: 'ลาพักร้อน' },
      { value: 'ลาอื่นๆ', label: 'ลาอื่นๆ' }
    ];

    // รวม options และกรองข้อมูลซ้ำด้วย Set
    const allOptions = [...options, ...leaveOptions];
    const uniqueOptions = Array.from(
      new Map(allOptions.map(option => [option.value, option])).values()
    );

    return uniqueOptions;

  } catch (error) {
    console.error('Error fetching drawing options:', error);
    return [];
  }
}

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
    const taskAssignRef = collection(db, 'tasks');
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
        status: data.status,
        isUploading: data.isUploading,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        isLeaveRow: data.isLeaveRow,
        leaveType: data.leaveType
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