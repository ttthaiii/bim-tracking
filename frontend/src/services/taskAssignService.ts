
import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../config/firebase'; 
import { DailyReportEntry, Subtask } from '../types/database';
import { getEmployeeByID } from './employeeService';

// This function fetches from the old, incorrect location. 
// It should be updated or replaced later to fetch from the sub-collections.
export const getEmployeeDailyReportEntries = async (
  employeeId: string
): Promise<DailyReportEntry[]> => {
  try {
    const reportsRef = collection(db, 'daily_reports', employeeId, 'reports');
    const querySnapshot = await getDocs(reportsRef);
    const entries: DailyReportEntry[] = [];
    querySnapshot.forEach((doc) => {
      entries.push({ id: doc.id, ...doc.data() } as DailyReportEntry);
    });
    return entries;
  } catch (error) {
    console.error('Error fetching daily report entries:', error);
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
  console.log('[DEBUG] Starting FINAL saveDailyReportEntries with correct data structure');
  try {
    const batch = writeBatch(db);
    const validEntries = entries.filter(entry => entry.subtaskId && entry.subtaskPath && entry.subtaskPath.includes('subtasks'));

    if (validEntries.length === 0) {
      console.log("[DEBUG] No valid entries with a proper subtaskPath to save. Aborting.");
      return;
    }

    for (const entry of validEntries) {
      // CHANGE: The Document ID is now the employee's ID, ensuring one document per employee per subtask.
      const dailyReportId = entry.employeeId;
      
      const dailyReportRef = doc(db, entry.subtaskPath!, 'dailyReport', dailyReportId);
      
      const { 
        id, relateDrawing, subtaskPath, normalWorkingHours, otWorkingHours, progress, note,
        ...mainDataToSave 
      } = entry;

      // ACTION 1: Set the main document data (e.g., project, taskName).
      // { merge: true } creates the document if it doesn't exist, and updates it without overwriting the workhours array if it does.
      batch.set(dailyReportRef, mainDataToSave, { merge: true });

      // Prepare the work log object to be added to the array
      const workLogData = {
        day: parseHours(entry.normalWorkingHours),
        ot: parseHours(entry.otWorkingHours),
        progress: parseInt(entry.progress, 10) || 0,
        note: entry.note || '',
        timestamp: new Date() // Use client-side timestamp
      };

      // ACTION 2: Update the 'workhours' array field by appending the new work log object.
      batch.update(dailyReportRef, {
        workhours: arrayUnion(workLogData)
      });
      
      console.log(`[DEBUG]   - Queued update for dailyReport ${dailyReportId}. Appending to workhours array.`);
    }

    await batch.commit();
    console.log('[DEBUG] Daily report workhours updated successfully!');
  } catch (error)
{
    console.error('[DEBUG] Error saving daily report entries:', error);
    throw error;
  }
};
