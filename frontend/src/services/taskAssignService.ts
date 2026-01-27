
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

// ✅ [T-005-E3] Optimized Query for "All Assign"
export const fetchAssignedSubtasks = async (assigneeName: string): Promise<any[]> => {
  try {
    console.log(`🔍 [T-045] Fetching subtasks for assignee: "${assigneeName}" via Collection Group Index`);

    if (!assigneeName) {
      console.warn('⚠️ [T-045] Assignee name is empty. Query will likely return nothing.');
      return [];
    }

    // Create Collection Group Query
    // [T-045] Optimized: Removed '!=' filter to use existing single-field index on 'subTaskAssignee'
    const subtasksQuery = query(
      collectionGroup(db, 'subtasks'),
      where('subTaskAssignee', '==', assigneeName)
      // where('subTaskStatus', '!=', 'DELETED') // ❌ Removed to fix "Missing Index" error match
    );

    const snapshot = await getDocs(subtasksQuery);
    console.log(`✅ [T-045] Found ${snapshot.size} assigned subtasks for "${assigneeName}".`);

    const subtasks = snapshot.docs
      .filter(doc => doc.data().subTaskStatus !== 'DELETED') // ✅ Filter in JS instead
      .map(doc => {
        const data = doc.data();
        const taskId = doc.ref.parent.parent?.id || ''; // tasks/{taskId}/subtasks/{subtaskId}

        return {
          id: doc.id,
          taskId: taskId,
          subTaskNumber: data.subTaskNumber || '',
          taskName: data.taskName || '',
          subTaskCategory: data.subTaskCategory || '',
          item: data.item || '',
          internalRev: data.internalRev || '',
          subTaskScale: data.subTaskScale || '',
          subTaskAssignee: data.subTaskAssignee || '',
          subTaskProgress: data.subTaskProgress || 0,
          startDate: data.startDate,
          endDate: data.endDate,
          subTaskFiles: data.subTaskFiles || null,
          // Additional fields if needed
          activity: data.activity || data.subTaskCategory || '', // Fallback
          relateDrawing: taskId, // approximate
          relateDrawingName: data.taskName || '',
          relateWork: data.subTaskCategory || '',
          workScale: data.subTaskScale || 'S',
          assignee: data.subTaskAssignee,
          progress: data.subTaskProgress || 0
        };
      });

    return subtasks;

  } catch (error: any) {
    console.error("❌ [T-045] Error fetching assigned subtasks:", error);
    if (error?.message?.includes('index')) {
      console.error("🚨 [T-045] Missing Index! Please create an index for 'subtasks' collection group on 'subTaskAssignee'. Check Firebase Console.");
    }
    // Return empty to prevent crash, but log is visible.
    return [];
  }
};

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
        // Fix: Fallback to ID from document path if data.subtaskId is missing
        const parentSubtaskDoc = docSnap.ref.parent.parent;
        const entrySubtaskId = data.subtaskId || (parentSubtaskDoc ? parentSubtaskDoc.id : '');

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
            employeeId: log.employeeId || data.employeeId,
            subtaskId: log.subtaskId || data.subtaskId || entrySubtaskId,
            subtaskPath,
            assignDate: assignDate,
            normalWorkingHours: `${Math.floor(log.day)}:${Math.round((log.day % 1) * 60)}`,
            otWorkingHours: `${Math.floor(log.ot)}:${Math.round((log.ot % 1) * 60)}`,
            progress: `${log.progress}%`,
            note: log.note,
            taskName: log.taskName || data.taskName || '',
            subTaskName: log.subTaskName || data.subTaskName || '',
            item: log.item || data.item || '',
            subTaskCategory: log.subTaskCategory || data.subTaskCategory || '',
            internalRev: log.internalRev || data.internalRev || '',
            subTaskScale: log.subTaskScale || data.subTaskScale || '',
            project: log.project || data.project || '',
            timestamp: log.timestamp,
            loggedAt: log.loggedAt,
            status: log.status || 'pending',
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
    // [T-031] Cache task data (status + category) to avoid re-fetching
    const taskDataCache = new Map<string, { status: string; category?: string } | null>();

    const getTaskData = async (subtaskDoc: QueryDocumentSnapshot<DocumentData>) => {
      const taskRef = subtaskDoc.ref.parent?.parent;
      if (!taskRef) return null;

      const cacheKey = taskRef.path;
      if (!taskDataCache.has(cacheKey)) {
        const parentSnap = await getDoc(taskRef);
        if (parentSnap.exists()) {
          const pData = parentSnap.data();
          taskDataCache.set(cacheKey, {
            status: pData.taskStatus ?? '',
            category: pData.taskCategory ?? '' // [T-031] Fetch Activity Type
          });
        } else {
          taskDataCache.set(cacheKey, null);
        }
      }
      return taskDataCache.get(cacheKey);
    };

    const shouldIncludeSubtask = async (subtaskDoc: QueryDocumentSnapshot<DocumentData>) => {
      const data = subtaskDoc.data() as Subtask;
      if ((data.subtaskStatus ?? (data as any).subTaskStatus ?? '').toUpperCase() === 'DELETED') {
        return false;
      }

      const taskData = await getTaskData(subtaskDoc);
      const status = taskData?.status;
      return (status ?? '').toUpperCase() !== 'DELETED';
    };

    const appendSubtasks = async (docs: QueryDocumentSnapshot<DocumentData>[]) => {
      // 1. Filter out duplicates first
      const uniqueDocs = docs.filter(doc => !subtaskIds.has(doc.id));

      // 2. Validate all docs in parallel
      const validationResults = await Promise.all(
        uniqueDocs.map(async (doc) => {
          const isValid = await shouldIncludeSubtask(doc);
          return { doc, isValid };
        })
      );

      // 3. Add valid docs to result
      for (const { doc, isValid } of validationResults) {
        if (isValid) {
          const data = doc.data() as Subtask;
          // [T-031] Inject taskCategory from cache
          const taskData = await getTaskData(doc);

          allSubtasks.push({
            ...data,
            id: doc.id,
            path: doc.ref.path,
            taskCategory: taskData?.category || ''
          });
          subtaskIds.add(doc.id);
        }
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


// Helper to determine true progress from workhours list with Deduplication
const calculateTrueProgress = (workhours: any[]): number => {
  if (!workhours || workhours.length === 0) return 0;

  // 1. Group by Date (YYYY-MM-DD) to Deduplicate (Keep Trend of Latest Timestamp)
  const latestByDate = new Map<string, any>();

  workhours.forEach(log => {
    // Resolve Date String safely
    let dateStr = log.assignDate;
    if (!dateStr) {
      if (log.loggedAt?.toDate) dateStr = log.loggedAt.toDate().toISOString().split('T')[0];
      else if (log.timestamp?.toDate) dateStr = log.timestamp.toDate().toISOString().split('T')[0];
      else if (log.loggedAt instanceof Date) dateStr = log.loggedAt.toISOString().split('T')[0];
      else if (log.timestamp instanceof Date) dateStr = log.timestamp.toISOString().split('T')[0];
    }

    if (!dateStr) return; // Skip invalid dates

    const current = latestByDate.get(dateStr);

    // Compare Timestamps
    const getMillis = (t: any) => {
      if (t?.toMillis) return t.toMillis();
      if (t instanceof Date) return t.getTime();
      if (typeof t === 'string') return new Date(t).getTime();
      return 0;
    };

    const logTime = getMillis(log.timestamp) || getMillis(log.loggedAt) || 0;
    const currentTime = current ? (getMillis(current.timestamp) || getMillis(current.loggedAt) || 0) : -1;

    // If new log is newer or same time (last writer wins), update map
    if (logTime >= currentTime) {
      latestByDate.set(dateStr, { ...log, assignDate: dateStr });
    }
  });

  // 2. Convert to Array and Filter out Deleted
  const validLogs = Array.from(latestByDate.values())
    .filter(log => log.status !== 'deleted');

  if (validLogs.length === 0) return 0;

  // 3. Sort by Date Descending to find "Current" Progress
  validLogs.sort((a, b) => {
    // String Compare YYYY-MM-DD
    if (a.assignDate > b.assignDate) return -1;
    if (a.assignDate < b.assignDate) return 1;
    return 0;
  });

  // 4. Return progress of the latest valid log
  return parseInt(String(validLogs[0].progress).replace('%', ''), 10) || 0;
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

    // cache cache (reduce reads if multiple entries for same subtask)
    const readCache: Record<string, any[]> = {};

    for (const entry of validEntries) {
      const normalizedSubtaskId = entry.subtaskId?.toUpperCase();
      const subtaskDocPath = entry.subtaskPath!;
      const dailyReportRef = doc(db, subtaskDocPath, 'dailyReport', entry.employeeId);
      const subtaskDocRef = doc(db, subtaskDocPath);

      // 1. Update Metadata
      const dailyReportMainData = {
        employeeId: entry.employeeId,
        subtaskId: normalizedSubtaskId,
        taskName: entry.taskName || '',
        subTaskName: entry.subTaskName || '',
        item: entry.item || '',
        subTaskCategory: entry.subTaskCategory || '',
        internalRev: entry.internalRev || '',
        subTaskScale: entry.subTaskScale || '',
        project: entry.project || '',
      };
      batch.set(dailyReportRef, dailyReportMainData, { merge: true });

      // 2. Prepare Work Log
      const newProgressNumber = parseInt(String(entry.progress).replace('%', ''), 10) || 0;
      const [year, month, day] = entry.assignDate.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day);
      selectedDate.setHours(12, 0, 0, 0);

      const now = new Date();

      const workLogData: any = {
        day: parseHours(entry.normalWorkingHours),
        ot: parseHours(entry.otWorkingHours),
        progress: newProgressNumber,
        note: entry.note || '',
        timestamp: now,
        loggedAt: selectedDate,
        assignDate: entry.assignDate,
        status: entry.status || 'pending'
      };

      if (entry.fileName) workLogData.fileName = entry.fileName;
      if (entry.fileURL) workLogData.fileURL = entry.fileURL;
      if (entry.storagePath) workLogData.storagePath = entry.storagePath;
      if (normalizedSubtaskId) workLogData.subtaskId = normalizedSubtaskId;
      if (entry.subtaskPath) workLogData.subtaskPath = entry.subtaskPath;
      if (entry.fileUploadedAt) workLogData.fileUploadedAt = entry.fileUploadedAt;

      // 3. Calculate True Progress using existing Data
      // Optimally we read once per docRef but loop is fine for small batch
      let existingWorkhours: any[] = [];

      if (readCache[dailyReportRef.path]) {
        existingWorkhours = readCache[dailyReportRef.path];
      } else {
        const currentReportSnap = await getDoc(dailyReportRef);
        const currentData = currentReportSnap.exists() ? currentReportSnap.data() : {};
        existingWorkhours = (currentData.workhours as any[]) || [];
        readCache[dailyReportRef.path] = existingWorkhours;
      }

      // Append new log (Simulating the state after batch commit)
      const allWorkLogs = [...existingWorkhours, workLogData];

      // Update our local cache for next iteration if same doc
      readCache[dailyReportRef.path] = allWorkLogs;

      const trueProgress = calculateTrueProgress(allWorkLogs);

      // Update Daily Report
      batch.update(dailyReportRef, {
        workhours: arrayUnion(workLogData)
      });

      // Update Subtask Progress (Source of Truth)
      batch.update(subtaskDocRef, {
        subTaskProgress: trueProgress // [T-005-E9] Correctly synced
      });

      console.log(`[DEBUG] Updated subtask ${entry.subtaskId} progress to ${trueProgress}%`);
    }

    await batch.commit();
  } catch (error) {
    console.error('[DEBUG] Error in saveDailyReportEntries:', error);
    throw error;
  }
};

// [T-005-E9] Function to delete entry (Soft Delete) and sync progress
export const deleteDailyReportEntry = async (
  employeeId: string,
  entryToDelete: DailyReportEntry
): Promise<void> => {
  // Reuse save logic by sending a deleted status payload
  // This ensures consistency with the main save function
  const deletionPayload: DailyReportEntry = {
    ...entryToDelete,
    status: 'deleted',
    progress: '0%', // Irrelevant but good for clarity
    note: 'Deleted via API',
    normalWorkingHours: '0:0',
    otWorkingHours: '0:0'
  };

  await saveDailyReportEntries(employeeId, [deletionPayload]);
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
