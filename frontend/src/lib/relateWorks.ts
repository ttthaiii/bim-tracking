import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * ดึงรายการ Activities ทั้งหมดจาก Firestore
 */
export const getActivities = async (): Promise<SelectOption[]> => {
  try {
    const relateWorksCol = collection(db, 'relateWorks');
    const snapshot = await getDocs(relateWorksCol);
    
    // ดึง activityName ที่ไม่ซ้ำกัน
    const activitiesSet = new Set<string>();
    
    snapshot.docs.forEach(doc => {
      const activityName = doc.data().activityName;
      if (activityName) {
        activitiesSet.add(activityName);
      }
    });
    
    // แปลงเป็น SelectOption และเรียงลำดับ
    const activities = Array.from(activitiesSet)
      .map(name => ({
        value: name,
        label: name
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    
    console.log('📋 Activities loaded:', activities.length);
    return activities;
    
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
};

/**
 * ดึงรายการ Relate Works ตาม Activity Name
 */
export const getRelateWorksByActivity = async (activityName: string): Promise<SelectOption[]> => {
  try {
    if (!activityName) return [];
    
    const relateWorksCol = collection(db, 'relateWorks');
    const q = query(relateWorksCol, where('activityName', '==', activityName));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('No relate works found for:', activityName);
      return [];
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    const relatedWorks = data.relatedWorks || {};
    
    const options = Object.values(relatedWorks)
      .map((work: any) => ({
        value: work,
        label: work
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    
    console.log('📋 Relate works loaded for', activityName, ':', options.length);
    return options;
    
  } catch (error) {
    console.error('Error fetching relate works:', error);
    return [];
  }
};