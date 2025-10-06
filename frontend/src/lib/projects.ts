import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface Project {
  id: string;
  name: string;
  abbr: string; // Add abbr field
}

export const getProjects = async (): Promise<Project[]> => {
  const projectsCol = collection(db, 'projects');
  const snapshot = await getDocs(projectsCol);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name,
    abbr: doc.data().abbr || 'N/A' // Fetch abbr, default to N/A if not found
  }));
};