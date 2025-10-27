import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, runTransaction, Timestamp } from 'firebase/firestore';
import { storage, db, ensureAuthenticated } from '../lib/firebase';

export const uploadFileToSubtask = async (
  file: File,
  subtaskPath: string // เช่น "/tasks/TTS-BIM-BIM-021-005/subtasks/subtaskId"
): Promise<string> => {
  try {
    // 1. Upload file to Firebase Storage
    const storageRef = ref(storage, `${subtaskPath}/${file.name}`);
    await uploadBytes(storageRef, file);
    
    // 2. Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    // 3. Update subtask document with the file link
    const subtaskRef = doc(db, subtaskPath);
    await updateDoc(subtaskRef, {
      link: downloadURL,
      lastUpdate: new Date()
    });
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
};

export const uploadFileForDailyReport = async (
  file: File,
  employeeId: string,
  subtaskId: string,
  workDate: string,
  subtaskPath: string
): Promise<{ cdnURL: string; storagePath: string; fileUploadedAt: Timestamp }> => {
  try {
    if (!subtaskPath) {
      throw new Error('ไม่พบข้อมูลเส้นทางของงาน (subtaskPath) สำหรับการอัปโหลดไฟล์');
    }

    // 1. Ensure user is authenticated
    console.log('Starting authentication...');
    const user = await ensureAuthenticated();
    console.log('User authenticated:', user);
    
    // 2. Create unique filename with timestamp
    const timestamp = new Date().getTime();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${employeeId}_${subtaskId}_${workDate}_${timestamp}.${fileExtension}`;
    
    // 3. Upload file to Firebase Storage under daily-reports folder
    const storagePath = `daily-reports/${employeeId}/${workDate}/${fileName}`;
    const storageRef = ref(storage, storagePath);
    console.log('Uploading file to:', storagePath);
    console.log('File size:', file.size, 'bytes');
    console.log('File type:', file.type);
    
    await uploadBytes(storageRef, file);
    console.log('File uploaded successfully');
    
    // 4. Get download URL
    //const downloadURL = await getDownloadURL(storageRef);
    //console.log('Download URL obtained:', downloadURL);
    
    // 5. Save file info to uploadedFiles collection
    const fileCDNPath = storagePath
      .split('/')
      .map(encodeURIComponent)
      .join('/');
    const cdnURL = `https://bim-tracking-cdn.ttthaiii30.workers.dev/${fileCDNPath}`;

    const fileUploadedAt = Timestamp.now();
    
    const dailyReportDocRef = doc(db, subtaskPath, 'dailyReport', employeeId);

    await runTransaction(db, async (tx) => {
      const snapshot = await tx.get(dailyReportDocRef);

      // --- 1. แก้ไขตรงนี้ ---
      // ถ้า snapshot ไม่มี (เอกสารใหม่) ให้ใช้ object ว่าง
      // ถ้ามี ก็ดึงข้อมูลออกมา
      const data = snapshot.exists() ? snapshot.data() : {};
      
      // ดึง workhours เดิม (ถ้ามี) หรือใช้ array ว่าง (ถ้าไม่มี)
      const workhours = Array.isArray(data?.workhours) ? [...data.workhours] : [];

      // ... (ส่วนของ normalizeToDateString ไม่เปลี่ยนแปลง) ...
      const normalizeToDateString = (value: any): string | null => {
        if (!value) return null;
        if (typeof value === 'string') {
          return value.split('T')[0];
        }
        if (value.toDate) {
          return value.toDate().toISOString().split('T')[0];
        }
        if (value instanceof Date) {
          return value.toISOString().split('T')[0];
        }
        return null;
      };

      // ... (ส่วนของ targetIndex ไม่เปลี่ยนแปลง) ...
      let targetIndex = -1;
      for (let i = workhours.length - 1; i >= 0; i -= 1) {
        const log = workhours[i];
        const assignDate = log.assignDate || normalizeToDateString(log.loggedAt) || normalizeToDateString(log.timestamp);
        if (assignDate === workDate) {
          targetIndex = i;
          break;
        }
      }

      // ... (ส่วนของ applyFileMetadata ไม่เปลี่ยนแปลง) ...
      const applyFileMetadata = (log: any = {}, override?: {
        fileName?: string;
        fileURL?: string;
        storagePath?: string;
        subtaskId?: string;
        subtaskPath?: string;
        fileUploadedAt?: Timestamp | Date | string | null;
      }) => {
        // ... (โค้ดภายใน applyFileMetadata เหมือนเดิม) ...
        const resolvedUploadedAt = override?.fileUploadedAt;
        let uploadedAtValue: Timestamp | undefined = fileUploadedAt;

        if (resolvedUploadedAt instanceof Timestamp) {
          uploadedAtValue = resolvedUploadedAt;
        } else if (resolvedUploadedAt instanceof Date) {
          uploadedAtValue = Timestamp.fromDate(resolvedUploadedAt);
        } else if (typeof resolvedUploadedAt === 'string') {
          const parsed = new Date(resolvedUploadedAt);
          if (!Number.isNaN(parsed.getTime())) {
            uploadedAtValue = Timestamp.fromDate(parsed);
          }
        }

        return {
          ...log,
          fileName: override?.fileName ?? file.name,
          fileURL: override?.fileURL ?? cdnURL,
          storagePath: override?.storagePath ?? storagePath,
          subtaskId: override?.subtaskId ?? subtaskId,
          subtaskPath: override?.subtaskPath ?? subtaskPath,
          fileUploadedAt: uploadedAtValue,
        };
      };

      // ... (ส่วนของการ push/update workhours ไม่เปลี่ยนแปลง) ...
      if (targetIndex === -1) {
        const defaultLoggedAt = Timestamp.fromDate(new Date(`${workDate}T12:00:00`));
        workhours.push(
          applyFileMetadata({
            day: 0,
            ot: 0,
            progress: 0,
            note: '',
            assignDate: workDate,
            loggedAt: defaultLoggedAt,
            timestamp: Timestamp.now(),
          })
        );
      } else {
        workhours[targetIndex] = applyFileMetadata(workhours[targetIndex]);
      }

      // ... (ส่วนของ cleanup legacy ไม่เปลี่ยนแปลง) ...
      workhours.forEach((log, index) => {
        if (log?.uploadedFiles) {
          const legacy = Array.isArray(log.uploadedFiles) ? log.uploadedFiles : [];
          if (!log.fileName && legacy.length > 0) {
            const latest = legacy[legacy.length - 1];
            workhours[index] = applyFileMetadata(log, {
              fileName: latest.fileName || file.name,
              fileURL: latest.fileURL || cdnURL,
              storagePath: latest.storagePath || storagePath,
              subtaskId: latest.subtaskId || subtaskId,
              subtaskPath: latest.subtaskPath || subtaskPath,
              fileUploadedAt: latest.uploadedAt || latest.uploadDate || fileUploadedAt,
            });
          } else {
            workhours[index] = { ...log };
          }
          delete (workhours[index] as any).uploadedFiles;
        }
      });

      // --- 2. แก้ไขตรงนี้ ---
      // เปลี่ยนจาก tx.update() เป็น tx.set() พร้อม { merge: true }
      // tx.set จะสร้างเอกสารใหม่ถ้ายังไม่มี หรือ อัปเดตข้อมูลถ้ามีอยู่แล้ว
      tx.set(dailyReportDocRef, { 
        workhours: workhours,
        employeeId: employeeId // เพิ่ม employeeId ไว้ด้วยเผื่อเป็นเอกสารใหม่
      }, { merge: true }); // merge: true สำคัญมาก! เพื่อไม่ให้เขียนทับ field อื่น
    });
    console.log('File metadata saved into workhours entry');

    return { cdnURL, storagePath, fileUploadedAt };
  } catch (error) {
    console.error('Detailed error uploading file:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      details: (error as any)?.details
    });
    throw new Error(`Failed to upload file for daily report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const uploadTaskEditAttachment = async (
  file: File,
  taskId: string
): Promise<{ cdnURL: string; storagePath: string; fileUploadedAt: Timestamp; fileName: string }> => {
  const user = await ensureAuthenticated();
  console.log('Uploading task edit attachment as:', user?.uid);

  const timestamp = Date.now();
  const extension = file.name.split('.').pop();
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const safeName = `${baseName}_${timestamp}.${extension}`;
  const storagePath = `task-edits/${taskId}/${safeName}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file);

  const cdnURL = `https://bim-tracking-cdn.ttthaiii30.workers.dev/${storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;

  return {
    cdnURL,
    storagePath,
    fileUploadedAt: Timestamp.now(),
    fileName: file.name,
  };
};
