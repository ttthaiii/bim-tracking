'use client';

import { useState, useEffect, useCallback } from 'react';
import { Project, Task, Subtask } from '@/types/database';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

interface LoadingState {
  project: boolean;
  tasks: boolean;
  subtasks: boolean;
}

export function useProjectData() {
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
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
      // แก้ไข: Firestore ไม่มี query 'id' โดยตรง, ต้องใช้ getDoc
      const projectRef = doc(db, 'projects', projectId);
      const projectDoc = await getDoc(projectRef);
      
      if (projectDoc.exists()) {
        // แก้ไข: Cast ข้อมูลที่ได้มาให้เป็น Type ที่ถูกต้องโดยตรง
        setProjectData({ id: projectDoc.id, ...projectDoc.data() } as Project);
      } else {
        setProjectData(null);
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
        ...doc.data()
      }));
      
      // แก้ไข: Cast ข้อมูลที่ได้มาให้เป็น Type ที่ถูกต้องโดยตรง
      setTasks(tasksData as Task[]);
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
        ...doc.data()
      }));
      
      // แก้ไข: Cast ข้อมูลที่ได้มาให้เป็น Type ที่ถูกต้องโดยตรง
      setSubtasks(prev => [...prev, ...subtasksData as Subtask[]]);
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