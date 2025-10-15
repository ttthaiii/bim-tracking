import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, serverTimestamp, setDoc, Timestamp, query, where, addDoc } from 'firebase/firestore';
import { Project, Task, RelateWork, Subtask } from '../types/database';
import { getTaskStatusCategory } from './taskStatus'; // ✅ ให้ import เข้ามาแบบนี้

// =================================================================
// 1. เปลี่ยนชื่อและ Export ฟังก์ชันให้ไฟล์อื่นเรียกใช้ได้
// =================================================================

/**
 * Fetches all projects from the database.
 */
export const getProjectDetails = async (): Promise<(Project & { id: string })[]> => {
  const projectsRef = collection(db, 'projects');
  const snapshot = await getDocs(projectsRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as (Project & { id: string })[];
};

/**
 * Fetches tasks for a specific project or all tasks if no projectId is provided.
 * Filters out tasks with 'DELETED' status.
 */
export const getTasksForProject = async (projectId?: string): Promise<(Task & { id: string })[]> => {
  const tasksRef = collection(db, 'tasks');
  const q = projectId 
    ? query(tasksRef, where('projectId', '==', projectId))
    : tasksRef;
  const snapshot = await getDocs(q);
  
  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    .filter((task: any) => task.taskStatus !== 'DELETED') as (Task & { id: string })[];
};

/**
 * Fetches subtasks for a specific task.
 * Filters out subtasks with 'DELETED' status.
 * หมายเหตุ: ฟังก์ชันเดิมของคุณรับ taskId แต่ cache.ts เรียกใช้ด้วย projectId และ taskId
 * ผมจึงปรับแก้ให้รับ projectId เข้ามาด้วย แต่ยังไม่ได้ใช้งาน
 */
export const getSubtasksForTask = async (projectId: string, taskId: string): Promise<(Subtask & { id: string })[]> => {
  const subTasksRef = collection(db, 'tasks', taskId, 'subtasks');
  const snapshot = await getDocs(subTasksRef);
  
  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    .filter((subtask: any) => subtask.subtaskStatus !== 'DELETED') as (Subtask & { id: string })[];
};


// =================================================================
// 2. ฟังก์ชันเดิมของคุณ (ที่ไม่ต้องแก้ไข)
// =================================================================
export const getTaskProgress = async () => {
  const tasks = await getTasksForProject();
  return {
    notStarted: tasks.filter(task => !task.startDate).length,
    inProgress: tasks.filter(task => task.startDate && !task.endDate).length,
    completed: tasks.filter(task => task.endDate).length
  };
};

export const getProjectProgress = async () => {
  const projects = await getProjectDetails();
  const tasks = await getTasksForProject();

  return projects.map(project => {
    const projectTasks = tasks.filter(task => task.projectId === project.id);
    const progress = projectTasks.length > 0
      ? projectTasks.reduce((acc, task) => acc + (task.progress || 0), 0) / projectTasks.length
      : 0;
    
    return {
      projectName: project.name,
      progress: Math.round(progress * 100)
    };
  });
};

export const getWorkloadByWeek = async (projectId?: string, excludedStatuses: string[] = []) => {
    const allTasks = await getTasksForProject(projectId);
    const filteredTasks = allTasks.filter(task => {
        const status = getTaskStatusCategory(task);
        return !excludedStatuses.includes(status);
    });

    function parseMultiFormatDate(dateStr: string): Date | null {
        if (!dateStr) return null;
        dateStr = dateStr.trim().replace(/\s+/g, ' ');
        let day, month, year;
        const formatA = dateStr.match(/^(\d{1,2})\s+([ก-์.]+)\s+(\d{2,4})$/);
        if (formatA) {
            [, day, month, year] = formatA;
        } else {
            const formatB = dateStr.replace(/\s+/g, '').split('/');
            if (formatB.length === 3) {
                [day, month, year] = formatB;
            } else {
                return null;
            }
        }
        day = day.trim(); month = month.trim(); year = year.trim();
        const monthMap: Record<string, number> = { 'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3, 'พ.ค.': 4, 'มิ.ย.': 5, 'ก.ค.': 6, 'ส.ค.': 7, 'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11, 'มกราคม': 0, 'กุมภาพันธ์': 1, 'มีนาคม': 2, 'เมษายน': 3, 'พฤษภาคม': 4, 'มิถุนายน': 5, 'กรกฎาคม': 6, 'สิงหาคม': 7, 'กันยายน': 8, 'ตุลาคม': 9, 'พฤศจิกายน': 10, 'ธันวาคม': 11, 'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11, 'january': 0, 'february': 1, 'march': 2, 'april': 3, 'june': 5, 'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11 };
        const monthKey = month.toLowerCase().trim();
        let monthNum: number | undefined = monthMap[monthKey];
        if (monthNum === undefined && !isNaN(parseInt(month))) {
            monthNum = parseInt(month) - 1;
            if (monthNum < 0 || monthNum > 11) return null;
        }
        if (monthNum === undefined) return null;
        if (year.length === 2) {
            const twoDigitYear = parseInt(year);
            year = (twoDigitYear < 50 ? '20' : '19') + year;
        }
        const dayNum = parseInt(day); const yearNum = parseInt(year);
        if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || isNaN(yearNum)) { return null; }
        return new Date(yearNum, monthNum, dayNum);
    }

    function getISOWeek(date: Date): number {
        const tmpDate = new Date(date.getTime());
        tmpDate.setHours(0, 0, 0, 0);
        tmpDate.setDate(tmpDate.getDate() + 4 - (tmpDate.getDay() || 7));
        const yearStart = new Date(tmpDate.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((tmpDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return weekNo;
    }

    const weekWorkload: Record<number, number> = {};
    filteredTasks.forEach(task => {
        let date: Date | null = null;
        if (task.dueDate instanceof Timestamp) {
            date = new Date(task.dueDate.seconds * 1000);
        } else if (typeof task.dueDate === 'string') {
            date = parseMultiFormatDate(task.dueDate);
        }
        if (date) {
            const week = getISOWeek(date);
            const workload = Number(task.estWorkload) || 8;
            weekWorkload[week] = (weekWorkload[week] || 0) + workload;
        }
    });

    return Array.from({ length: 52 }, (_, i) => ({
        week: i + 1,
        workload: weekWorkload[i + 1] || 0
    }));
};

export const fetchRelateWorks = async () => {
    const relateWorksRef = collection(db, 'relateWorks');
    const snapshot = await getDocs(relateWorksRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (RelateWork & { id: string })[];
};

export const fetchRelateWorksByProject = async (activityName: string) => {
    const relateWorksRef = collection(db, 'relateWorks');
    const snapshot = await getDocs(relateWorksRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((item: any) => item.activityName === activityName) as (RelateWork & { id: string })[];
};

export const updateTask = async (taskId: string, data: Partial<Task>) => {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, { ...data, lastUpdate: serverTimestamp() });
};

export const createTask = async (projectId: string, taskData: any) => {
    const taskId = taskData.id;
    const taskRef = doc(db, 'tasks', taskId);
    const newTask = {
        projectId,
        taskName: taskData.relateDrawing,
        taskNumber: taskData.id,
        taskCategory: taskData.activity,
        taskAssignee: '',
        planStartDate: taskData.startDate ? Timestamp.fromDate(new Date(taskData.startDate)) : null,
        startDate: null,
        dueDate: taskData.dueDate ? Timestamp.fromDate(new Date(taskData.dueDate)) : null,
        endDate: null,
        estWorkload: 0,
        subtaskCount: 0,
        totalMH: 0,
        progress: 0,
        currentStep: '',
        rev: taskData.rev || '00',
        documentNumber: taskData.docNo || '',
        link: taskData.link || '',
        taskStatus: 'ACTIVE',
        lastUpdate: serverTimestamp()
    };
    await setDoc(taskRef, newTask);
    return taskId;
};

export const deleteTask = async (taskId: string) => {
    try {
        const subtasksRef = collection(db, 'tasks', taskId, 'subtasks');
        const subtasksSnapshot = await getDocs(subtasksRef);
        console.log(`🗑️ Soft deleting ${subtasksSnapshot.size} subtasks...`);
        const updateSubtasksPromises = subtasksSnapshot.docs.map(subtaskDoc =>
            updateDoc(subtaskDoc.ref, {
                subtaskStatus: 'DELETED',
                deletedAt: Timestamp.now()
            })
        );
        await Promise.all(updateSubtasksPromises);
        const taskRef = doc(db, 'tasks', taskId);
        await updateDoc(taskRef, {
            taskStatus: 'DELETED',
            deletedAt: Timestamp.now()
        });
        console.log('✅ Task และ subtasks ถูก soft delete สำเร็จ');
    } catch (error) {
        console.error('❌ Error soft deleting task:', error);
        throw error;
    }
};

export const createProject = async (projectData: { name: string; code: string; leader: string }) => {
    const projectsRef = collection(db, 'projects');
    const newProject = {
        name: projectData.name,
        abbr: projectData.code,
        projectAssignee: projectData.leader,
        createdAt: Timestamp.now()
    };
    const docRef = await addDoc(projectsRef, newProject);
    console.log('✅ สร้างโปรเจกต์สำเร็จ:', docRef.id);
    return docRef.id;
};

export const updateProjectLeader = async (projectId: string, newLeader: string) => {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
        projectAssignee: newLeader
    });
    console.log('✅ อัพเดท Leader สำเร็จ');
};