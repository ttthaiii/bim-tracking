import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Project, Task, User } from '@/types/database';

export async function getProjectCount() {
  const projectsRef = collection(db, 'projects');
  const snapshot = await getDocs(projectsRef);
  return snapshot.size;
}

export async function getActiveTaskCount() {
  const tasksRef = collection(db, 'tasks');
  const q = query(tasksRef, where('endDate', '==', null)); // Tasks that haven't been completed
  const snapshot = await getDocs(q);
  return snapshot.size;
}

export async function getTeamMemberCount() {
  const usersRef = collection(db, 'DB_Login');
  const snapshot = await getDocs(usersRef);
  return snapshot.size;
}

export async function getDashboardStats() {
  try {
    const [projectCount, activeTaskCount, teamMemberCount] = await Promise.all([
      getProjectCount(),
      getActiveTaskCount(),
      getTeamMemberCount()
    ]);

    return {
      projectCount,
      activeTaskCount,
      teamMemberCount
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      projectCount: 0,
      activeTaskCount: 0,
      teamMemberCount: 0
    };
  }
}