
import {
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DailyReportEntry, Subtask, UploadedFile } from '../types/database';
import { getEmployeeByID } from './employeeService';

// Fetches all daily report entries for a given employee from the correct sub-collection location.
export const getEmployeeDailyReportEntries = async (
  employeeId: string
): Promise<DailyReportEntry[]> => {
  try {
    console.log('Getting daily report entries for employee:', employeeId);
    const reportGroupRef = collectionGroup(db, 'dailyReport');
    const q = query(reportGroupRef, where('employeeId', '==', employeeId));
    const querySnapshot = await getDocs(q);
    
    console.log('Query snapshot size:', querySnapshot.size);
    const allEntries: DailyReportEntry[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.workhours && Array.isArray(data.workhours)) {
        const subtaskPath = docSnap.ref.path.split('/dailyReport')[0];

        const toMillis = (value: any): number => {
          if (!value) return 0;
          if (typeof value === 'number') return value;
          if (value instanceof Date) return value.getTime();
          if (typeof value.toMillis === 'function') return value.toMillis();
          if (typeof value.toDate === 'function') return value.toDate().getTime();
          return 0;
        };

        // เรียงลำดับข้อมูลตาม timestamp (เวลาที่บันทึก) ล่าสุด
        const sortedLogs = [...data.workhours].sort((a, b) => {
          const timeA = toMillis(a.timestamp || a.loggedAt);
          const timeB = toMillis(b.timestamp || b.loggedAt);
          return timeB - timeA; // เรียงจากใหม่ไปเก่า
        });

        sortedLogs.forEach((log: any, index: number) => {
          // ใช้ assignDate ถ้ามี, ไม่งั้นใช้ timestamp
          let assignDate: string;
          if (log.assignDate) {
            assignDate = log.assignDate;
          } else if (log.timestamp?.toDate) {
            assignDate = log.timestamp.toDate().toISOString().split('T')[0];
          } else if (log.loggedAt?.toDate) {
            assignDate = log.loggedAt.toDate().toISOString().split('T')[0];
          } else {
            assignDate = new Date().toISOString().split('T')[0];
          }

          let fileName = log.fileName || '';
          let fileURL = log.fileURL || '';
          let storagePath = log.storagePath;
          let fileUploadedAt: Timestamp | undefined = log.fileUploadedAt instanceof Timestamp
            ? log.fileUploadedAt
            : log.uploadedAt instanceof Timestamp
              ? log.uploadedAt
              : log.uploadDate instanceof Timestamp
                ? log.uploadDate
                : undefined;

          if (!fileUploadedAt && typeof log.fileUploadedAt === 'string') {
            const parsed = new Date(log.fileUploadedAt);
            if (!Number.isNaN(parsed.getTime())) {
              fileUploadedAt = Timestamp.fromDate(parsed);
            }
          }

          if ((!fileName || !fileURL) && Array.isArray(log.uploadedFiles) && log.uploadedFiles.length > 0) {
            const legacy = log.uploadedFiles[log.uploadedFiles.length - 1];
            fileName = fileName || legacy.fileName || '';
            fileURL = fileURL || legacy.fileURL || '';
            storagePath = storagePath || legacy.storagePath;
            fileUploadedAt = fileUploadedAt
              || (legacy.uploadedAt instanceof Timestamp ? legacy.uploadedAt : undefined)
              || (legacy.uploadDate instanceof Timestamp ? legacy.uploadDate : undefined);

            if (!fileUploadedAt && typeof legacy.uploadedAt === 'string') {
              const legacyDate = new Date(legacy.uploadedAt);
              if (!Number.isNaN(legacyDate.getTime())) {
                fileUploadedAt = Timestamp.fromDate(legacyDate);
              }
            }
            if (!fileUploadedAt && typeof legacy.uploadDate === 'string') {
              const legacyUploadDate = new Date(legacy.uploadDate);
              if (!Number.isNaN(legacyUploadDate.getTime())) {
                fileUploadedAt = Timestamp.fromDate(legacyUploadDate);
              }
            }
          }
          
          // Generate a truly unique ID for each individual log entry
          const uniqueEntryId = `${docSnap.id}-${log.subtaskId || data.subtaskId}-${assignDate}-${log.timestamp?.toMillis?.() || 0}-${index}`;

          allEntries.push({
            id: uniqueEntryId,
            employeeId: log.employeeId || data.employeeId, // <-- 💥 แก้ไข: อ่านจาก log ก่อน
            subtaskId: log.subtaskId || data.subtaskId,   // (อันนี้คุณแก้แล้ว)
            subtaskPath,
            assignDate: assignDate,
            normalWorkingHours: `${Math.floor(log.day)}:${Math.round((log.day % 1) * 60)}`,
            otWorkingHours: `${Math.floor(log.ot)}:${Math.round((log.ot % 1) * 60)}`,
            progress: `${log.progress}%`,
            note: log.note,
            
            // --- 💥 แก้ไขทั้งหมด ให้อ่านจาก 'log' ก่อน 💥 ---
            taskName: log.taskName || data.taskName || '',
            subTaskName: log.subTaskName || data.subTaskName || '',
            item: log.item || data.item || '',
            subTaskCategory: log.subTaskCategory || data.subTaskCategory || '',
            internalRev: log.internalRev || data.internalRev || '',
            subTaskScale: log.subTaskScale || data.subTaskScale || '',
            project: log.project || data.project || '',
            
            timestamp: log.timestamp,
            loggedAt: log.loggedAt, 
            status: 'pending',
            relateDrawing: '',
            fileName,
            fileURL,
            storagePath,
            fileUploadedAt,
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
    const taskStatusCache = new Map<string, string | null>();

    const shouldIncludeSubtask = async (subtaskDoc: QueryDocumentSnapshot<DocumentData>) => {
      const data = subtaskDoc.data() as Subtask;
      if ((data.subtaskStatus ?? '').toUpperCase() === 'DELETED') {
        return false;
      }
      const taskRef = subtaskDoc.ref.parent?.parent;
      if (!taskRef) return true;
      const cacheKey = taskRef.path;
      if (!taskStatusCache.has(cacheKey)) {
        const parentSnap = await getDoc(taskRef);
        const status = parentSnap.exists() ? (parentSnap.data()?.taskStatus ?? null) : null;
        taskStatusCache.set(cacheKey, status);
      }
      const status = taskStatusCache.get(cacheKey);
      return (status ?? '').toUpperCase() !== 'DELETED';
    };

    const appendSubtasks = async (docs: QueryDocumentSnapshot<DocumentData>[]) => {
      for (const subtaskDoc of docs) {
        if (subtaskIds.has(subtaskDoc.id)) continue;
        if (!(await shouldIncludeSubtask(subtaskDoc))) continue;
        const data = subtaskDoc.data() as Subtask;
        allSubtasks.push({ ...data, id: subtaskDoc.id, path: subtaskDoc.ref.path });
        subtaskIds.add(subtaskDoc.id);
      }
    };
    
    const subtasksGroupRef = collectionGroup(db, 'subtasks');
    const qPersonal = query(subtasksGroupRef, where('subTaskAssignee', '==', employee.fullName));
    const personalSnapshot = await getDocs(qPersonal);
    await appendSubtasks(personalSnapshot.docs);

    const qAll = query(subtasksGroupRef, where('subTaskAssignee', '==', 'all'));
    const allSnapshot = await getDocs(qAll);
    await appendSubtasks(allSnapshot.docs);

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
      // สร้าง Date object จาก assignDate (วันที่เลือกจากปฏิทิน)
      const [year, month, day] = entry.assignDate.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day);
      selectedDate.setHours(12, 0, 0, 0); // ตั้งเวลาเป็นเที่ยงวัน
      
      // สร้าง timestamp ปัจจุบัน
      const now = new Date();
      
      console.log('[DEBUG] Saving work log with dates:', {
        assignDate: entry.assignDate,
        selectedDate: selectedDate.toISOString(),
        currentTime: now.toISOString()
      });

      const workLogData: any = {
        // --- ข้อมูลเดิม ---
        day: parseHours(entry.normalWorkingHours),
        ot: parseHours(entry.otWorkingHours),
        progress: newProgressNumber,
        note: entry.note || '',
        timestamp: now,
        loggedAt: selectedDate,
        assignDate: entry.assignDate,

        // --- 💥 คัดลอกข้อมูลจาก dailyReportMainData มาใส่ที่นี่ 💥 ---
        employeeId: entry.employeeId, // <-- เพิ่ม
        subtaskId: entry.subtaskId,   // <-- ย้าย if(entry.subtaskId) มาไว้ตรงนี้เลย
        taskName: entry.taskName || '',
        subTaskName: entry.subTaskName || '',
        item: entry.item || '',
        subTaskCategory: entry.subTaskCategory || '',
        internalRev: entry.internalRev || '',
        subTaskScale: entry.subTaskScale || '',
        project: entry.project || '',
      };

      if (entry.fileName) {
        workLogData.fileName = entry.fileName;
      }
      if (entry.fileURL) {
        workLogData.fileURL = entry.fileURL;
      }
      if (entry.storagePath) {
        workLogData.storagePath = entry.storagePath;
      }
      if (entry.subtaskId) {
        workLogData.subtaskId = entry.subtaskId;
      }
      if (entry.subtaskPath) {
        workLogData.subtaskPath = entry.subtaskPath;
      }
      if (entry.fileUploadedAt) {
        workLogData.fileUploadedAt = entry.fileUploadedAt;
      }

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

export const getUploadedFilesForEmployee = async (employeeId: string): Promise<UploadedFile[]> => {
  try {
    const reportGroupRef = collectionGroup(db, 'dailyReport');
    const q = query(reportGroupRef, where('employeeId', '==', employeeId));
    const querySnapshot = await getDocs(q);

    const files: UploadedFile[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const subtaskPath = docSnap.ref.path.split('/dailyReport')[0];
      const parentSubtask = docSnap.ref.parent?.parent;
      const workhours = Array.isArray(data.workhours) ? data.workhours : [];

      workhours.forEach((log: any, logIndex: number) => {
        const assignDate = log.assignDate
          ? log.assignDate
          : log.loggedAt?.toDate?.().toISOString().split('T')[0]
            || log.timestamp?.toDate?.().toISOString().split('T')[0]
            || '';

        const addFile = (fileData: any, suffix: string) => {
          if (!fileData?.fileName || !fileData?.fileURL) return;

          const uploadedAtValue = fileData.fileUploadedAt || fileData.uploadedAt || fileData.uploadDate;
          const uploadedAt = uploadedAtValue instanceof Timestamp
            ? uploadedAtValue
            : uploadedAtValue
              ? Timestamp.fromDate(new Date(uploadedAtValue))
              : undefined;

          files.push({
            id: `${docSnap.id}-${logIndex}-${suffix}`,
            employeeId: fileData.employeeId || data.employeeId || employeeId,
            subtaskId: fileData.subtaskId || data.subtaskId || parentSubtask?.id || '',
            subtaskPath: fileData.subtaskPath || subtaskPath,
            workDate: fileData.workDate || assignDate,
            fileName: fileData.fileName,
            fileURL: fileData.fileURL,
            storagePath: fileData.storagePath,
            fileUploadedAt: uploadedAt,
            subtaskName: data.subTaskName || data.subtaskName || '',
          });
        };

        addFile(log, 'inline');

        if (Array.isArray(log.uploadedFiles)) {
          log.uploadedFiles.forEach((legacy: any, legacyIndex: number) => {
            addFile(
              {
                ...legacy,
                subtaskId: legacy?.subtaskId || log.subtaskId,
                subtaskPath: legacy?.subtaskPath || subtaskPath,
                workDate: legacy?.workDate || assignDate,
              },
              `legacy-${legacyIndex}`
            );
          });
        }
      });
    });

    return files;
  } catch (error) {
    console.error('Error fetching uploaded files:', error);
    return [];
  }
};
