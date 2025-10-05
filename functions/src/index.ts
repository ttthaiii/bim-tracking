import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

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