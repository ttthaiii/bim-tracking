import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export interface TaskOption {
  id: string;
  taskname: string;
  currentStep: string;
  projectId: string;
}

export interface DrawingOption {
  id: string;
  relateDrawing: string;
}

export const getTasksByProjectId = async (projectId: string): Promise<TaskOption[]> => {
  if (!projectId) return [];
  
  const tasksCol = collection(db, 'tasks');
  // แยก query เป็น 2 ขั้นตอน
  const q = query(tasksCol, where('projectId', '==', projectId));
  const snapshot = await getDocs(q);
  
  // กรอง currentStep ในหน่วยความจำแทน
  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      taskname: doc.data().taskname,
      currentStep: doc.data().currentStep,
      projectId: doc.data().projectId
    }))
    .filter(task => 
      !['APPROVED_WITH_COMMENTS', 'APPROVED'].includes(task.currentStep)
    );
};

export const getDrawingsByProjectId = async (projectId: string): Promise<DrawingOption[]> => {
  if (!projectId) return [];
  
  const tasksCol = collection(db, 'tasks');
  const q = query(tasksCol, where('projectId', '==', projectId));
  const snapshot = await getDocs(q);
  
  // Get unique drawings
  const uniqueDrawings = new Set<string>();
  snapshot.docs.forEach(doc => {
    const drawing = doc.data().relateDrawing;
    if (drawing) uniqueDrawings.add(drawing);
  });
  
  return Array.from(uniqueDrawings).map(drawing => ({
    id: drawing,
    relateDrawing: drawing
  }));
};