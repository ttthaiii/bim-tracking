import { db } from '../config/firebase';
import { collection, query, where, getDocs, collectionGroup, doc, writeBatch, serverTimestamp, runTransaction, arrayUnion, DocumentReference } from 'firebase/firestore';
import { DailyReportEntry, Subtask } from '@/types/database';
import { getEmployeeByID } from './employeeService';

// This function is now incorrect based on the new DB structure.
// It will be replaced by saveDailyReport.
export const saveDailyReportEntries = async (entries: DailyReportEntry[]): Promise<void> => {
    // This logic is deprecated.
    console.error("saveDailyReportEntries is deprecated and should not be used.");
    return;
};

// New function to save data according to the correct DB structure
export const saveDailyReport = async (entries: DailyReportEntry[], employeeId: string) => {
    try {
        await runTransaction(db, async (transaction) => {
            // Group entries by subtaskPath to reduce reads
            const entriesBySubtask: { [path: string]: DailyReportEntry[] } = {};
            entries.forEach(entry => {
                if (!entry.subtaskPath || !entry.subtaskId) return;
                if (!entriesBySubtask[entry.subtaskPath]) {
                    entriesBySubtask[entry.subtaskPath] = [];
                }
                entriesBySubtask[entry.subtaskPath].push(entry);
            });

            for (const subtaskPath in entriesBySubtask) {
                const subtaskEntries = entriesBySubtask[subtaskPath];
                const dailyReportRef = doc(db, `${subtaskPath}/dailyReport/${employeeId}`);

                // We need to get the document first to update the array
                const dailyReportDoc = await transaction.get(dailyReportRef);
                
                let workhours = dailyReportDoc.exists() ? dailyReportDoc.data().workhours || [] : [];

                subtaskEntries.forEach(entry => {
                    const [dayH, dayM] = entry.normalWorkingHours.split(':').map(Number);
                    const [otH, otM] = entry.otWorkingHours.split(':').map(Number);

                    const newWorkhour = {
                        day: dayH + (dayM / 60), // Convert to decimal hours
                        ot: otH + (otM / 60), // Convert to decimal hours
                        progress: parseInt(entry.progress) || 0,
                        timestamp: new Date(entry.assignDate), // Use the report date
                        // Add any other fields from entry if they exist in the workhours object
                    };

                    // Check if an entry for this date already exists
                    const existingIndex = workhours.findIndex((wh: any) => 
                        wh.timestamp && new Date(wh.timestamp.toDate()).toISOString().split('T')[0] === entry.assignDate
                    );

                    if (existingIndex > -1) {
                        // Update existing entry
                        workhours[existingIndex] = newWorkhour;
                    } else {
                        // Add new entry
                        workhours.push(newWorkhour);
                    }
                });

                // Update the document in the transaction
                if (dailyReportDoc.exists()) {
                    transaction.update(dailyReportRef, { workhours });
                } else {
                    // If the doc doesn't exist, create it with the initial data
                    const firstEntry = subtaskEntries[0];
                    transaction.set(dailyReportRef, {
                        item: firstEntry.item,
                        project: firstEntry.project,
                        subTaskName: firstEntry.subTaskName,
                        taskName: firstEntry.taskName,
                        // subTaskNumber might be needed here if it's part of the DB structure
                        workhours: workhours
                    });
                }
            }
        });
        console.log("Transaction successfully committed!");
    } catch (e) {
        console.error("Transaction failed: ", e);
        throw e; // Re-throw the error to be caught by the calling function
    }
};


export const getEmployeeDailyReportEntries = async (employeeId: string): Promise<DailyReportEntry[]> => {
  // This function might need re-evaluation based on the new DB structure.
  // For now, it's assumed to be fetching from a (now incorrect) central collection.
  // We will leave it as is, but rely on creating new entries from the UI.
  console.warn("getEmployeeDailyReportEntries may not function as expected with the new DB structure.");
  return [];
};

export const fetchAvailableSubtasksForEmployee = async (employeeId: string): Promise<Subtask[]> => {
  try {
    const allSubtasks: Subtask[] = [];
    const employee = await getEmployeeByID(employeeId);
    
    if (!employee?.fullName) {
      console.warn(`Employee with ID ${employeeId} not found or fullName is missing.`);
      return [];
    }

    const subtasksGroupRef = collectionGroup(db, 'subtasks');
    const qSubtasks = query(subtasksGroupRef, where('subTaskAssignee', '==', employee.fullName));
    const subtaskSnapshot = await getDocs(qSubtasks);

    subtaskSnapshot.forEach((subtaskDoc) => {
      allSubtasks.push({
        ...(subtaskDoc.data() as Subtask),
        id: subtaskDoc.id,
        path: subtaskDoc.ref.path, // <-- ADDED PATH HERE
      });
    });

    return allSubtasks;
  } catch (error) {
    console.error('Error fetching available subtasks:', error);
    return [];
  }
};
