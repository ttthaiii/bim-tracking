import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// ✅ 1. เพิ่ม import 'onCall' และ 'CallableRequest'
import { onCall, CallableRequest } from "firebase-functions/v2/https";

admin.initializeApp();
const db = admin.firestore();

const getWlFromScale = (scale: string): number => {
  switch (scale?.toUpperCase()) {
    case "S": return 2;
    case "M": return 5;
    case "L": return 8;
    default: return 0;
  }
};

export const aggregateSubtaskData = onDocumentWritten(
  {
    document: "tasks/{taskId}/subtasks/{subtaskId}/dailyReport/{reportId}",
    region: "asia-southeast1",
  },
  async (event) => {
    logger.info("--- aggregateSubtaskData function triggered! ---");

    const { taskId, subtaskId } = event.params;
    const subtaskDocRef = db.doc(`tasks/${taskId}/subtasks/${subtaskId}`);
    
    const [subtaskDoc, reportsSnapshot] = await Promise.all([
        subtaskDocRef.get(),
        subtaskDocRef.collection("dailyReport").get()
    ]);

    if (!subtaskDoc.exists) {
      logger.error(`Could not find parent subtask at path: ${subtaskDocRef.path}`);
      return;
    }
    const subtaskData = subtaskDoc.data()!;
    logger.info(`Found ${reportsSnapshot.size} dailyReport(s) for subtask ${subtaskId}.`);

    let allWorkEntries: any[] = [];
    reportsSnapshot.forEach(doc => {
        const reportData = doc.data();
        const workhours = reportData.workhours; 

        if (Array.isArray(workhours)) {
            workhours.forEach((entry: any) => {
                if (entry.timestamp && typeof entry.timestamp.toDate === 'function') {
                    allWorkEntries.push({ ...entry, timestamp: entry.timestamp.toDate() });
                } else {
                    logger.warn("Found a work entry with invalid or missing timestamp:", entry);
                }
            });
        }
    });
    logger.info(`Found a total of ${allWorkEntries.length} work hour entries.`);

    if (allWorkEntries.length === 0) {
        logger.info("No work entries found. Resetting subtask values.");
        await subtaskDocRef.update({ 
            mhOD: 0, 
            mhOT: 0, 
            subTaskProgress: 0, 
            startDate: null, 
            endDate: null, 
            lastUpdate: null, 
            wlRemaining: getWlFromScale(subtaskData.subTaskScale) 
        });
        return;
    }

    allWorkEntries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const firstEntry = allWorkEntries[0];
    const lastEntry = allWorkEntries[allWorkEntries.length - 1];
    
    const startDate = firstEntry.timestamp;
    const lastUpdate = lastEntry.timestamp;
    const subTaskProgress = lastEntry.progress || 0;
    
    const finalReportEntry = allWorkEntries.slice().reverse().find(e => e.progress === 100);
    const endDate = finalReportEntry ? finalReportEntry.timestamp : null;
    
    const totals = allWorkEntries.reduce((acc, entry) => {
        acc.mhOD += entry.day || 0;
        acc.mhOT += entry.ot || 0;
        return acc;
    }, { mhOD: 0, mhOT: 0 });
    
    const wlFromscale = getWlFromScale(subtaskData.subTaskScale);
    const wlRemaining = wlFromscale * (1 - (subTaskProgress / 100));

    const updatePayload = { 
        subTaskNumber: subtaskId, // <-- KEY CHANGE: Ensure subTaskNumber matches the document ID
        startDate, 
        endDate, 
        lastUpdate, 
        mhOD: totals.mhOD, 
        mhOT: totals.mhOT, 
        subTaskProgress, 
        wlFromscale, 
        wlRemaining 
    };
    logger.info("Final payload to be updated:", updatePayload);

    try {
        await subtaskDocRef.update(updatePayload);
        logger.info(`✅ Successfully updated subtask '${subtaskId}'!`);
    } catch (error) {
        logger.error(`❌ Error updating subtask '${subtaskId}':`, error);
    }
  }
);

export const aggregateTaskData = onDocumentWritten(
  {
    document: "tasks/{taskId}/subtasks/{subtaskId}",
    region: "asia-southeast1",
  },
  async (event) => {
    logger.info("--- aggregateTaskData function triggered! ---");

    const taskId = event.params.taskId;
    logger.info(`Parent task ID to update: ${taskId}`);

    const subtasksCollectionRef = db.collection(`tasks/${taskId}/subtasks`);

    const allSubtasksSnapshot = await subtasksCollectionRef.get();
    const allSubtasks = allSubtasksSnapshot.docs.map(doc => doc.data());

    if (allSubtasks.length === 0) {
      logger.info(`No subtasks found for task ${taskId}. Resetting task values.`);
      const taskRef = db.collection("tasks").doc(taskId);
      await taskRef.update({
        subtaskCount: 0,
        progress: 0,
        estWorkload: 0,
        totalMH: 0,
        startDate: null,
        endDate: null,
        lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    logger.info(`Found ${allSubtasks.length} subtasks. Starting calculation...`);

    let subtaskCount = allSubtasks.length;
    let totalProgress = 0;
    let estWorkload = 0;
    let totalMH = 0;
    let startDates: Date[] = [];
    let lastUpdates: Date[] = [];
    let endDates: Date[] = [];
    let allSubtasksAreDone = true;

    allSubtasks.forEach(subtask => {
      totalProgress += subtask.subTaskProgress || 0;
      estWorkload += subtask.wlFromscale || 0;
      totalMH += (subtask.mhOD || 0) + (subtask.mhOT || 0);

      if (subtask.startDate?.toDate) startDates.push(subtask.startDate.toDate());
      if (subtask.lastUpdate?.toDate) lastUpdates.push(subtask.lastUpdate.toDate());
      
      if (subtask.subTaskProgress < 100) {
        allSubtasksAreDone = false;
      }
      if (subtask.endDate?.toDate) {
        endDates.push(subtask.endDate.toDate());
      }
    });

    const progress = totalProgress / subtaskCount;
    const startDate = startDates.length > 0 ? new Date(Math.min(...startDates.map(d => d.getTime()))) : null;
    const lastUpdate = lastUpdates.length > 0 ? new Date(Math.max(...lastUpdates.map(d => d.getTime()))) : null;
    
    const endDate = allSubtasksAreDone && endDates.length > 0 
      ? new Date(Math.max(...endDates.map(d => d.getTime()))) 
      : null;

    const updatePayload = {
      subtaskCount,
      progress,
      estWorkload,
      totalMH,
      startDate,
      endDate,
      lastUpdate,
    };
    logger.info("Final payload for parent task:", updatePayload);

    const taskRef = db.collection("tasks").doc(taskId);
    try {
      await taskRef.update(updatePayload);
      logger.info(`✅ Successfully updated parent task '${taskId}'!`);
    } catch (error) {
      logger.error(`❌ Error updating parent task '${taskId}':`, error);
    }
  }
);

// ✅ 2. เพิ่ม Type 'CallableRequest' ให้กับ 'request'
export const getNextTaskCounter = onCall(
  { region: "asia-southeast1" },
  async (request: CallableRequest) => {
    // 1. รับ projectId จาก frontend
    const projectId = request.data.projectId;
    if (!projectId) {
      logger.error("No projectId provided for getNextTaskCounter");
      throw new Error("Missing projectId.");
    }

    const counterRef = db.doc(`projectCounters/${projectId}`);
    logger.info(`Getting next task number for project: ${projectId}`);

    try {
      // 2. ใช้ Transaction เพื่อรับประกันว่าไม่มีใครแย่ง
      const newCount = await db.runTransaction(async (t) => {
        const counterDoc = await t.get(counterRef);

        // 3. อ่านเลขปัจจุบัน (ถ้าไม่มี ให้เริ่มที่ 0)
        const currentNumber = counterDoc.data()?.currentTaskNumber || 0;
        
        // 4. บวก 1
        const nextNumber = currentNumber + 1;

        // 5. เขียนเลขใหม่กลับไปที่ DB
        t.set(counterRef, { currentTaskNumber: nextNumber }, { merge: true });

        // 6. คืนค่าเลขใหม่
        return nextNumber;
      });

      logger.info(`Successfully generated new task number: ${newCount} for project: ${projectId}`);
      // 7. ส่งเลขใหม่กลับไปให้ Frontend
      return { newCount: newCount };

    } catch (error) {
      logger.error(`Error generating task number for ${projectId}:`, error);
      throw new Error("Could not generate task number.");
    }
  }
);