import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Project, Task, SubTask } from '@/types/database';

export const fetchProjects = async () => {
  const projectsRef = collection(db, 'projects');
  const snapshot = await getDocs(projectsRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as (Project & { id: string })[];
};

export const fetchTasks = async (projectId?: string) => {
  const tasksRef = collection(db, 'tasks');
  const q = projectId 
    ? query(tasksRef, where('projectId', '==', projectId))
    : tasksRef;
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as (Task & { id: string })[];
};

export const fetchSubTasks = async (taskId: string) => {
  const subTasksRef = collection(db, 'tasks', taskId, 'subtasks');
  const snapshot = await getDocs(subTasksRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as (SubTask & { id: string })[];
};

export const getTaskProgress = async () => {
  const tasks = await fetchTasks();
  return {
    notStarted: tasks.filter(task => !task.startDate).length,
    inProgress: tasks.filter(task => task.startDate && !task.endDate).length,
    completed: tasks.filter(task => task.endDate).length
  };
};

export const getProjectProgress = async () => {
  const projects = await fetchProjects();
  const tasks = await fetchTasks();

  return projects.map(project => {
    const projectTasks = tasks.filter(task => task.projectId === project.id);
    const progress = projectTasks.length > 0
      ? projectTasks.reduce((acc, task) => acc + task.progress, 0) / projectTasks.length
      : 0;
    
    return {
      projectName: project.name,
      progress: Math.round(progress * 100)
    };
  });
};

export const getWorkloadByAssignee = async () => {
  const tasks = await fetchTasks();
  const workloadMap = new Map<string, number>();

  tasks.forEach(task => {
    const current = workloadMap.get(task.taskAssignee) || 0;
    workloadMap.set(task.taskAssignee, current + task.estWorkload);
  });

  return Array.from(workloadMap.entries()).map(([assignee, workload]) => ({
    assignee,
    workload
  }));
};