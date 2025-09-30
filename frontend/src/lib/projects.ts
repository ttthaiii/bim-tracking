import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface Project {
  id: string;
  name: string;
}

export const getProjects = async (): Promise<Project[]> => {
  const projectsCol = collection(db, 'projects');
  const snapshot = await getDocs(projectsCol);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name
  }));
};