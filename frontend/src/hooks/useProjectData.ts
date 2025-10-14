'use client';

import { useState, useCallback } from 'react';
import { ProjectData, TaskData, SubtaskData } from '@/types/task';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface LoadingState {
  project: boolean;
  tasks: boolean;
  subtasks: boolean;
}

export function useProjectData() {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [subtasks, setSubtasks] = useState<SubtaskData[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    project: false,
    tasks: false,
    subtasks: false
  });

  const loadProjectData = useCallback(async (projectId: string) => {
    if (!projectId) {
      setProjectData(null);
      setTasks([]);
      setSubtasks([]);
      return;
    }

    try {
      setLoading(prev => ({ ...prev, project: true }));
      const projectRef = collection(db, 'projects');
      const projectQuery = query(projectRef, where('id', '==', projectId));
      const snapshot = await getDocs(projectQuery);
      
      if (!snapshot.empty) {
        const projectDoc = snapshot.docs[0];
        setProjectData({
          id: projectDoc.id,
          name: projectDoc.data().name || '',
          abbr: projectDoc.data().abbr || '',
          ...projectDoc.data()
        });
      }
    } catch (error) {
      console.error('Error loading project data:', error);
    } finally {
      setLoading(prev => ({ ...prev, project: false }));
    }
  }, []);

  const loadProjectTasks = useCallback(async (projectId: string) => {
    if (!projectId) {
      setTasks([]);
      return;
    }

    try {
      setLoading(prev => ({ ...prev, tasks: true }));
      const tasksRef = collection(db, 'tasks');
      const tasksQuery = query(tasksRef, where('projectId', '==', projectId));
      const snapshot = await getDocs(tasksQuery);
      
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        taskName: doc.data().taskName || '',
        taskCategory: doc.data().taskCategory || doc.data().category || '',
        ...doc.data()
      }));
      
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading project tasks:', error);
    } finally {
      setLoading(prev => ({ ...prev, tasks: false }));
    }
  }, []);

  const loadTaskSubtasks = useCallback(async (taskId: string) => {
    if (!taskId) return;

    try {
      setLoading(prev => ({ ...prev, subtasks: true }));
      const subtasksRef = collection(db, 'tasks', taskId, 'subtasks');
      const snapshot = await getDocs(subtasksRef);
      
      const subtasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        taskId,
        ...doc.data()
      }));
      
      setSubtasks(prev => [...prev, ...subtasksData]);
    } catch (error) {
      console.error('Error loading task subtasks:', error);
    } finally {
      setLoading(prev => ({ ...prev, subtasks: false }));
    }
  }, []);

  return {
    projectData,
    tasks,
    subtasks,
    loading,
    loadProjectData,
    loadProjectTasks,
    loadTaskSubtasks
  };
}
