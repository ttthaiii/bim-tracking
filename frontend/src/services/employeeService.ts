import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const getEmployeeByID = async (employeeId: string) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('employeeId', '==', employeeId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      return {
        employeeId: userData.employeeId,
        fullName: userData.fullName,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching employee:', error);
    return null;
  }
};