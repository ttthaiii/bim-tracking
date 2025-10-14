import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface Project {
  id: string;
  name: string;
  abbr: string;
  status: string;  // Required by database.ts
  description?: string;
  startDate?: any;  // Use firebase Timestamp
  dueDate?: any;  // Use firebase Timestamp
}

export const getProjects = async (): Promise<Project[]> => {
  const projectsCol = collection(db, 'projects');
  const snapshot = await getDocs(projectsCol);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      abbr: data.abbr || 'N/A', // Default to N/A if not found
      status: data.status || 'active', // Default to active if not set
      description: data.description,
      startDate: data.startDate,
      dueDate: data.dueDate
    };
  });
};