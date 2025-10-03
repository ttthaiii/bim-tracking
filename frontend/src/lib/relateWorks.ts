import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface RelateWork {
  id: string;
  activityName: string;
  relatedWorks: { [key: string]: string };
}

export interface ActivityOption {
  value: string; // activityName
  label: string; // activityName
}

export interface RelateWorkOption {
  value: string; // work name
  label: string; // work name
}

/**
 * ดึงข้อมูล Activities ทั้งหมดจาก Collection relateWorks
 */
export const getActivities = async (): Promise<ActivityOption[]> => {
  try {
    const relateWorksCol = collection(db, 'relateWorks');
    const snapshot = await getDocs(relateWorksCol);
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as RelateWork;
      return {
        value: data.activityName || doc.id,
        label: data.activityName || doc.id
      };
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
};

/**
 * ดึงข้อมูล Relate Works ตาม Activity Name ที่เลือก
 * แก้ไขให้ใช้ activityName แทน document ID
 */
export const getRelateWorksByActivity = async (
  activityName: string
): Promise<RelateWorkOption[]> => {
  try {
    if (!activityName) return [];
    
    const relateWorksCol = collection(db, 'relateWorks');
    
    // ใช้ query where activityName แทนการ find by document id
    const q = query(relateWorksCol, where('activityName', '==', activityName));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.warn(`No relate works found for activity: ${activityName}`);
      return [];
    }
    
    // เอา document แรก (ควรมีแค่ document เดียวที่ match)
    const doc = snapshot.docs[0];
    const data = doc.data() as RelateWork;
    const relatedWorks = data.relatedWorks || {};
    
    // แปลง object เป็น array of options และเรียงลำดับ
    return Object.values(relatedWorks)
      .map(work => ({
        value: work,
        label: work
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch (error) {
    console.error('Error fetching relate works:', error);
    return [];
  }
};

/**
 * ดึงข้อมูล RelateWork document ทั้งหมด
 */
export const getAllRelateWorks = async (): Promise<RelateWork[]> => {
  try {
    const relateWorksCol = collection(db, 'relateWorks');
    const snapshot = await getDocs(relateWorksCol);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as RelateWork));
  } catch (error) {
    console.error('Error fetching all relate works:', error);
    return [];
  }
};