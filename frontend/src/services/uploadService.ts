import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { storage, db, ensureAuthenticated } from '../config/firebase';

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
): Promise<string> => {
  try {
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
    const downloadURL = await getDownloadURL(storageRef);
    console.log('Download URL obtained:', downloadURL);
    
    // 5. Save file info to uploadedFiles collection
    const uploadedFileData = {
      employeeId,
      subtaskId,
      workDate,
      fileName: file.name,
      storagePath,
      fileURL: downloadURL,
      fileSize: file.size,
      uploadDate: new Date(),
      subtaskPath
    };
    
    await addDoc(collection(db, 'uploadedFiles'), uploadedFileData);
    console.log('File metadata saved to Firestore');
    
    return downloadURL;
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