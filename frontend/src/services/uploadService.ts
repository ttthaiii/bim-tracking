import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '../config/firebase';

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