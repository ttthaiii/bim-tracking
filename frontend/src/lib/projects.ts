import { collection, getDocs, Timestamp } from 'firebase/firestore'; // <--- เพิ่ม Timestamp
import { db } from './firebase';

export interface Project {
  id: string;
  name: string;
  abbr: string;
  status: string;
  description?: string;
  startDate?: Timestamp; // <--- แก้ไข type
  dueDate?: Timestamp;   // <--- แก้ไข type
  createdAt: Timestamp; // <--- เพิ่ม property ที่ขาดไป
}

export const getProjects = async (): Promise<Project[]> => {
  const projectsCol = collection(db, 'projects');
  const snapshot = await getDocs(projectsCol);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      abbr: data.abbr || 'N/A',
      status: data.status || 'active',
      description: data.description,
      startDate: data.startDate,
      dueDate: data.dueDate,
      // <--- เพิ่มการดึงค่า createdAt (ถ้าไม่มีใน DB จะใช้เวลาปัจจุบันแทน)
      createdAt: data.createdAt || Timestamp.now() 
    };
  });
};