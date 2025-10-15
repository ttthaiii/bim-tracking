import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface User {
  id: string;
  fullName: string;  // เปลี่ยนจาก FullName
}

export const getUsers = async (): Promise<User[]> => {
  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      fullName: doc.data().fullName || ''  // เปลี่ยนจาก FullName
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};