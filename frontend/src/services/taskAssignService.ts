
import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase'; 
import { DailyReportEntry, Subtask } from '../types/database';
import { getEmployeeByID } from './employeeService';

// Fetches all daily report entries for a given employee from the correct sub-collection location.
export const getEmployeeDailyReportEntries = async (
  employeeId: string
): Promise<DailyReportEntry[]> => {
  try {
    const reportGroupRef = collectionGroup(db, 'dailyReport');
    const q = query(reportGroupRef, where('employeeId', '==', employeeId));
    const querySnapshot = await getDocs(q);
    
    const allEntries: DailyReportEntry[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.workhours && Array.isArray(data.workhours)) {
        data.workhours.forEach((log: any, index: number) => {
          const assignDate = log.timestamp.toDate().toISOString().split('T')[0];
          
          // Generate a truly unique ID for each individual log entry
          const uniqueEntryId = `${doc.id}-${data.subtaskId}-${assignDate}-${log.timestamp.toMillis()}-${index}`;

          allEntries.push({
            id: uniqueEntryId,
            employeeId: data.employeeId,
            subtaskId: data.subtaskId,
            subtaskPath: doc.ref.path.split('/dailyReport')[0],
            assignDate: assignDate,
            normalWorkingHours: `${Math.floor(log.day)}:${Math.round((log.day % 1) * 60)}`,
            otWorkingHours: `${Math.floor(log.ot)}:${Math.round((log.ot % 1) * 60)}`,
            progress: `${log.progress}%`,
            note: log.note,
            taskName: data.taskName || '',
            subTaskName: data.subTaskName || '',
            item: data.item || '',
            subTaskCategory: data.subTaskCategory || '',
            internalRev: data.internalRev || '',
            subTaskScale: data.subTaskScale || '',
            project: data.project || '',
            logTimestamp: log.timestamp,
          } as DailyReportEntry);
        });
      }
    });
    
    return allEntries;
  } catch (error) {
    console.error('Error fetching daily report entries from collection group:', error);
    return [];
  }
};


export const fetchAvailableSubtasksForEmployee = async (
  employeeId: string
): Promise<Subtask[]> => {
  try {
    const employee = await getEmployeeByID(employeeId);
    if (!employee) return [];
    
    const allSubtasks: Subtask[] = [];
    const subtaskIds = new Set<string>();
    
    const subtasksGroupRef = collectionGroup(db, 'subtasks');
    const qPersonal = query(subtasksGroupRef, where('subTaskAssignee', '==', employee.fullName));
    const personalSnapshot = await getDocs(qPersonal);
    
    personalSnapshot.forEach((subtaskDoc) => {
      if (!subtaskIds.has(subtaskDoc.id)) {
        const data = subtaskDoc.data() as Subtask;
        allSubtasks.push({ ...data, id: subtaskDoc.id, path: subtaskDoc.ref.path });
        subtaskIds.add(subtaskDoc.id);
      }
    });

    const qAll = query(subtasksGroupRef, where('subTaskAssignee', '==', 'all'));
    const allSnapshot = await getDocs(qAll);

    allSnapshot.forEach((subtaskDoc) => {
      if (!subtaskIds.has(subtaskDoc.id)) {
        const data = subtaskDoc.data() as Subtask;
        allSubtasks.push({ ...data, id: subtaskDoc.id, path: subtaskDoc.ref.path });
        subtaskIds.add(subtaskDoc.id);
      }
    });

    return allSubtasks;
  } catch (error) {
    console.error('Error fetching available subtasks:', error);
    return [];
  }
};

// Helper function to convert time string "H:M" to a numeric hour value
const parseHours = (timeString: string): number => {
  if (!timeString || !timeString.includes(':')) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours || 0) + ((minutes || 0) / 60);
};


export const saveDailyReportEntries = async (
  employeeId: string,
  entries: DailyReportEntry[]
): Promise<void> => {
  console.log('[DEBUG] Starting saveDailyReportEntries');
  try {
    const batch = writeBatch(db);
    const validEntries = entries.filter(entry => entry.subtaskId && entry.subtaskPath && entry.subtaskPath.includes('subtasks'));

    if (validEntries.length === 0) {
      console.log("[DEBUG] No valid entries with a proper subtaskPath to save. Aborting.");
      return;
    }

    for (const entry of validEntries) {
      // Path to the subtask document, e.g., /projects/XYZ/tasks/ABC/subtasks/123
      const subtaskDocPath = entry.subtaskPath!;
      
      // Path to the dailyReport document for this employee within the subtask
      const dailyReportRef = doc(db, subtaskDocPath, 'dailyReport', entry.employeeId);
      
      // Ref to the subtask document itself to update its main progress
      const subtaskDocRef = doc(db, subtaskDocPath);

      // 1. Define the core data for the dailyReport document.
      // This should only contain metadata about the task and employee, not logs.
      const dailyReportMainData = {
        employeeId: entry.employeeId,
        subtaskId: entry.subtaskId,
        // Fields below are for easier querying/display if needed
        taskName: entry.taskName || '',
        subTaskName: entry.subTaskName || '',
        item: entry.item || '',
        subTaskCategory: entry.subTaskCategory || '',
        internalRev: entry.internalRev || '',
        subTaskScale: entry.subTaskScale || '',
        project: entry.project || '',
      };

      // Set/merge this metadata into the employee's dailyReport document.
      batch.set(dailyReportRef, dailyReportMainData, { merge: true });

      // 2. Prepare the new work log entry.
      const newProgressNumber = parseInt(entry.progress.replace('%', ''), 10) || 0;
      const workLogData = {
        day: parseHours(entry.normalWorkingHours),
        ot: parseHours(entry.otWorkingHours),
        progress: newProgressNumber, // Use the parsed number
        note: entry.note || '',
        timestamp: new Date()
      };

      // Atomically add the new work log to the 'workhours' array.
      batch.update(dailyReportRef, {
        workhours: arrayUnion(workLogData)
      });
      
      // 3. IMPORTANT: Update the progress on the subtask document itself.
      // This ensures the new progress is the source of truth for the next day.
      batch.update(subtaskDocRef, {
          subTaskProgress: newProgressNumber
      });
      
      console.log(`[DEBUG] Queued update for dailyReport ${entry.employeeId}. Appending to workhours.`);
      console.log(`[DEBUG] Queued update for subtask ${entry.subtaskId}. Setting subTaskProgress to ${newProgressNumber}.`);
    }

    await batch.commit();
    console.log('[DEBUG] Batch commit successful! Daily reports and subtask progresses updated.');
  } catch (error) {
    console.error('[DEBUG] Error in saveDailyReportEntries:', error);
    throw error;
  }
};

export interface UploadedFile {
    id: string;
    fileName: string;
    fileURL: string;
    subtaskId: string;
    subtaskName: string;
    uploadedAt: Timestamp;
    workDate: string;
  }
  
  export const getUploadedFilesForEmployee = async (employeeId: string): Promise<UploadedFile[]> => {
    try {
      const filesRef = collection(db, 'dailyReportFiles');
      const q = query(filesRef, where('employeeId', '==', employeeId));
      const querySnapshot = await getDocs(q);
      
      const files: UploadedFile[] = [];
      querySnapshot.forEach((doc) => {
        files.push({ id: doc.id, ...doc.data() } as UploadedFile);
      });
      
      return files;
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
      return [];
    }
  };
