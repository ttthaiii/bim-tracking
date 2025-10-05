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
  taskAssignee: string; // เปลี่ยนจาก assignee เป็น taskAssignee
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
    console.log('getRelateDrawingOptions called with fullName:', fullName);
    
    // Get projects collection
    const projectsRef = collection(db, 'projects');
    const projectsSnap = await getDocs(projectsRef);
    
    console.log('Projects found:', projectsSnap.docs.length);
    
    // Create a map for quick project lookup
    const projectsMap = new Map();
    projectsSnap.docs.forEach(doc => {
      const data = doc.data();
      console.log('Project data:', { projectId: doc.id, abbr: data.abbr, name: data.name });
      projectsMap.set(doc.id, data.abbr);
    });

    // Get tasks collection
    const tasksRef = collection(db, 'tasks');
    const tasksSnap = await getDocs(tasksRef);
    
    console.log('Tasks found:', tasksSnap.docs.length);

    // Get subtasks from each task document and filter by subTaskAssignee
    const options: { value: string; label: string; }[] = [];
    
    for (const taskDoc of tasksSnap.docs) {
      const taskData = taskDoc.data();
      console.log('Processing task:', taskData.taskName);
      
      // Get subtasks subcollection for each task
      const subtasksRef = collection(db, 'tasks', taskDoc.id, 'subtasks');
      const subtasksSnap = await getDocs(subtasksRef);
      
      console.log('Subtasks found for task', taskData.taskName, ':', subtasksSnap.docs.length);
      
      subtasksSnap.docs.forEach(subtaskDoc => {
        const subtaskData = subtaskDoc.data();
        
        // Multiple matching strategies for subTaskAssignee
        const exactMatch = subtaskData.subTaskAssignee === fullName;
        const trimmedMatch = subtaskData.subTaskAssignee?.trim() === fullName?.trim();
        const partialMatch = subtaskData.subTaskAssignee?.includes(fullName) || fullName?.includes(subtaskData.subTaskAssignee);
        
        console.log('Subtask matching check:', {
          subTaskName: subtaskData.subTaskName,
          subTaskAssignee: subtaskData.subTaskAssignee,
          searchFullName: fullName,
          subTaskProgress: subtaskData.subTaskProgress,
          exactMatch,
          trimmedMatch,
          partialMatch,
          progressOk: (subtaskData.subTaskProgress || 0) < 100
        });
        
        // Check if subtask is assigned to this user and not completed (progress < 100)
        if ((exactMatch || trimmedMatch) && (subtaskData.subTaskProgress || 0) < 100) {
          
          // Get project abbreviation from projectsMap
          const abbr = projectsMap.get(taskData.projectId) || 'Unknown';
          
          // Create the display format: abbr_taskName_subtaskName
          const value = `${abbr}_${taskData.taskName}_${subtaskData.subTaskName}`;
          const label = value;
          
          console.log('✅ Adding option:', { value, label });
          
          options.push({
            value,
            label
          });
        }
      });
    }

    console.log('Total options before deduplication:', options.length);

    // If no exact matches found, try partial matches
    if (options.length === 0) {
      console.log('No exact matches found, trying partial matches...');
      
      for (const taskDoc of tasksSnap.docs) {
        const taskData = taskDoc.data();
        
        const subtasksRef = collection(db, 'tasks', taskDoc.id, 'subtasks');
        const subtasksSnap = await getDocs(subtasksRef);
        
        subtasksSnap.docs.forEach(subtaskDoc => {
          const subtaskData = subtaskDoc.data();
          
          const partialMatch = subtaskData.subTaskAssignee?.includes(fullName) || fullName?.includes(subtaskData.subTaskAssignee);
          
          if (partialMatch && (subtaskData.subTaskProgress || 0) < 100) {
            const abbr = projectsMap.get(taskData.projectId) || 'Unknown';
            const value = `${abbr}_${taskData.taskName}_${subtaskData.subTaskName}`;
            const label = value;
            
            console.log('✅ Adding option (partial match):', { value, label });
            
            options.push({
              value,
              label
            });
          }
        });
      }
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

    console.log('Final unique options:', uniqueOptions.length);
    console.log('Final options:', uniqueOptions);

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