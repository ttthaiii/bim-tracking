import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { getBimTrackingDb, getAdminDb } from "./lib/firebase/admin";
import * as admin from "firebase-admin"; // <--- ของเดิม

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

    const data = event.data?.after.data() || event.data?.before.data();
    if (!data) {
      logger.warn("No data in event. Exiting.");
      return;
    }
    const subTaskNumber = data.subTaskNumber;
    if (!subTaskNumber) {
      logger.warn("Missing 'subTaskNumber'. Exiting.");
      return;
    }
    logger.info(`Processing subTaskNumber: ${subTaskNumber}`);

    const [reportsSnapshot, subtaskQuery] = await Promise.all([
      db.collectionGroup("dailyReport").where("subTaskNumber", "==", subTaskNumber).get(),
      db.collectionGroup("subtasks").where("subTaskNumber", "==", subTaskNumber).limit(1).get(),
    ]);

    if (subtaskQuery.empty) {
      logger.error(`Could not find a matching subtask with subTaskNumber: ${subTaskNumber}`);
      return;
    }
    const subtaskDocRef = subtaskQuery.docs[0].ref;
    const subtaskData = subtaskQuery.docs[0].data();
    logger.info(`Found ${reportsSnapshot.size} dailyReport(s) for this subtask.`);

    let allWorkEntries: any[] = [];
    reportsSnapshot.forEach(doc => {
        const reportData = doc.data();
        const workingHours = reportData.workhours; // แก้ไขชื่อ field ให้ตรงกับรูปภาพของคุณ
        const files = reportData.files;

        // --- จุดที่แก้ไขให้รองรับ Array ---
        if (Array.isArray(workingHours)) {
            workingHours.forEach((entry: any) => {
                if (entry.timestamp) {
                    allWorkEntries.push({ ...entry, timestamp: entry.timestamp.toDate(), parentFiles: files });
                }
            });
        }
        // --- จบจุดที่แก้ไข ---
    });
    logger.info(`Found a total of ${allWorkEntries.length} work hour entries.`);

    if (allWorkEntries.length === 0) {
        logger.info("No work entries found. Resetting subtask values.");
        await subtaskDocRef.update({ mhOD: 0, mhOT: 0, subTaskProgress: 0, startDate: null, endDate: null, lastUpdate: null, subTaskFiles: [], wlRemaining: getWlFromScale(subtaskData.subTaskScale) });
        return;
    }

    allWorkEntries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const firstEntry = allWorkEntries[0];
    const lastEntry = allWorkEntries[allWorkEntries.length - 1];
    const startDate = firstEntry.timestamp;
    const lastUpdate = lastEntry.timestamp;
    const subTaskProgress = lastEntry.progress || 0;
    const subTaskFiles = lastEntry.parentFiles || [];
    const finalReportEntry = allWorkEntries.slice().reverse().find(e => e.progress === 100);
    const endDate = finalReportEntry ? finalReportEntry.timestamp : null;
    const totals = allWorkEntries.reduce((acc, entry) => {
        acc.mhOD += entry.day || 0;
        acc.mhOT += entry.ot || 0;
        return acc;
    }, { mhOD: 0, mhOT: 0 });
    const wlFromscale = getWlFromScale(subtaskData.subTaskScale);
    const wlRemaining = wlFromscale * (1 - (subTaskProgress / 100));

    const updatePayload = { startDate, endDate, lastUpdate, subTaskFiles, mhOD: totals.mhOD, mhOT: totals.mhOT, subTaskProgress, wlFromscale, wlRemaining };
    logger.info("Final payload to be updated:", updatePayload);

    try {
        await subtaskDocRef.update(updatePayload);
        logger.info(`✅ Successfully updated subtask '${subTaskNumber}'!`);
    } catch (error) {
        logger.error(`❌ Error updating subtask '${subTaskNumber}':`, error);
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

    // 1. ดึง taskId จาก event parameter เพื่อหาว่า task ตัวไหนที่ต้องอัปเดต
    const taskId = event.params.taskId;
    logger.info(`Parent task ID to update: ${taskId}`);

    // 2. อ้างอิงไปยัง collection ของ subtasks ทั้งหมดของ task นี้
    const subtasksCollectionRef = db.collection(`tasks/${taskId}/subtasks`);

    // 3. ดึงข้อมูล subtasks ทั้งหมดออกมา
    const allSubtasksSnapshot = await subtasksCollectionRef.get();
    const allSubtasks = allSubtasksSnapshot.docs.map(doc => doc.data());

    // 4. ถ้าไม่มี subtask เหลืออยู่เลย (เช่น ถูกลบไปหมด) ให้ reset ค่าที่ task หลัก
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
        lastUpdate: admin.firestore.FieldValue.serverTimestamp(), // อัปเดตเวลาล่าสุด
      });
      return;
    }

    logger.info(`Found ${allSubtasks.length} subtasks. Starting calculation...`);

    // 5. เริ่มทำการคำนวณค่าต่างๆ
    let subtaskCount = allSubtasks.length;
    let totalProgress = 0;
    let estWorkload = 0;
    let totalMH = 0;
    let startDates: Date[] = [];
    let lastUpdates: Date[] = [];
    let endDates: Date[] = [];
    let allSubtasksAreDone = true;

    allSubtasks.forEach(subtask => {
      // --- คำนวณผลรวม ---
      totalProgress += subtask.subTaskProgress || 0;
      estWorkload += subtask.wlFromscale || 0;
      totalMH += (subtask.mhOD || 0) + (subtask.mhOT || 0);

      // --- เก็บค่าวันที่เพื่อหา min/max ---
      if (subtask.startDate?.toDate) startDates.push(subtask.startDate.toDate());
      if (subtask.lastUpdate?.toDate) lastUpdates.push(subtask.lastUpdate.toDate());
      
      // --- ตรวจสอบเงื่อนไข endDate ---
      if (subtask.subTaskProgress < 100) {
        allSubtasksAreDone = false;
      }
      if (subtask.endDate?.toDate) {
        endDates.push(subtask.endDate.toDate());
      }
    });

    // 6. สรุปผลการคำนวณ
    const progress = totalProgress / subtaskCount;
    const startDate = startDates.length > 0 ? new Date(Math.min(...startDates.map(d => d.getTime()))) : null;
    const lastUpdate = lastUpdates.length > 0 ? new Date(Math.max(...lastUpdates.map(d => d.getTime()))) : null;
    
    // endDate จะมีค่าก็ต่อเมื่อทุก subtask เสร็จ 100%
    const endDate = allSubtasksAreDone && endDates.length > 0 
      ? new Date(Math.max(...endDates.map(d => d.getTime()))) 
      : null;

    // 7. เตรียมข้อมูลสำหรับอัปเดต
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

    // 8. อัปเดตข้อมูลที่เอกสาร task หลัก
    const taskRef = db.collection("tasks").doc(taskId);
    try {
      await taskRef.update(updatePayload);
      logger.info(`✅ Successfully updated parent task '${taskId}'!`);
    } catch (error) {
      logger.error(`❌ Error updating parent task '${taskId}':`, error);
    }
  }
);

export const onBimTrackingTaskUpdate = onDocumentWritten(
  {
    document: "tasks/{taskId}",
    region: "asia-southeast1",
    secrets: ["TTSDOC_PRIVATE_KEY", "BIM_TRACKING_PRIVATE_KEY", "TTSDOC_PROJECT_ID", "TTSDOC_CLIENT_EMAIL"]
  },
  async (event) => {
    const taskId = event.params.taskId;
    const dataAfter = event.data?.after.data();
    const dataBefore = event.data?.before.data();

    if (!dataAfter || !dataBefore) {
        logger.log(`[Sync Back/${taskId}] No data to process.`);
        return null;
    }

    const isWorkRequest = dataAfter.taskCategory === 'Work Request';
    const isWorkAccepted = !dataBefore.planStartDate && dataAfter.planStartDate;

    if (!isWorkRequest || !isWorkAccepted) {
        logger.log(`[Sync Back/${taskId}] No action needed. (isWorkRequest: ${isWorkRequest}, isWorkAccepted: ${isWorkAccepted})`);
        return null;
    }

    logger.log(`[Sync Back/${taskId}] Work Request accepted. Syncing status back to ttsdoc...`);

    try {
        const link = dataAfter.link as string;
        if (!link || !link.includes('/dashboard/work-request?docId=')) {
            throw new Error("Task link is invalid or does not belong to a Work Request.");
        }

        const wrDocId = link.split('docId=')[1];
        if (!wrDocId) {
            throw new Error(`Could not extract Work Request ID from link: ${link}`);
        }

        const ttsdocDb = getAdminDb();
        const wrRef = ttsdocDb.collection("workRequests").doc(wrDocId);

        await wrRef.update({
            status: 'IN_PROGRESS',
            planStartDate: dataAfter.planStartDate,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.log(`✅ [Sync Back/${taskId}] Successfully updated Work Request ${wrDocId} to IN_PROGRESS.`);

    } catch (error) {
        logger.error(`[Sync Back/${taskId}] Failed to sync status back to ttsdoc:`, error);
        const bimTrackingDb = getBimTrackingDb();
        await bimTrackingDb.collection("tasks").doc(taskId).update({
          syncBackError: (error as Error).message
        });
    }

    return null;
  }
);