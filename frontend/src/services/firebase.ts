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

export const getWorkloadByWeek = async (projectId?: string) => {
  // ดึง tasks ตาม projectId (ถ้ามี)
  const tasks = await fetchTasks(projectId);
  console.log("All tasks for projectId:", projectId, tasks);

  // Helper to parse multiple date formats (Thai/English, short/full)
  function parseMultiFormatDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    console.log("Parsing date string:", dateStr);

    // Clean up the date string
    dateStr = dateStr.trim().replace(/\s+/g, ' ');
    console.log("Cleaned date string:", dateStr);

    // Try different Thai date formats
    let day, month, year;

    // Format: "4 ส.ค. 25" or "4 ส.ค. 2025"
    const formatA = dateStr.match(/^(\d{1,2})\s+([ก-์.]+)\s+(\d{2,4})$/);
    if (formatA) {
      [, day, month, year] = formatA;
      console.log("Matched format A:", { day, month, year });
    } else {
      // Format: "21/ ก.พ./2025" or "18/ก.ค./2025"
      const formatB = dateStr.replace(/\s+/g, '').split('/');
      if (formatB.length === 3) {
        [day, month, year] = formatB;
        console.log("Matched format B:", { day, month, year });
      } else {
        console.log("No format matched");
        return null;
      }
    }

    // Clean up components
    day = day.trim();
    month = month.trim();
    year = year.trim();

    // Month name mappings (Thai abbreviated)
    const monthMap: Record<string, number> = {
      'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3,
      'พ.ค.': 4, 'มิ.ย.': 5, 'ก.ค.': 6, 'ส.ค.': 7, 
      'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11,
      
      // Thai full
      'มกราคม': 0, 'กุมภาพันธ์': 1, 'มีนาคม': 2, 'เมษายน': 3,
      'พฤษภาคม': 4, 'มิถุนายน': 5, 'กรกฎาคม': 6, 'สิงหาคม': 7,
      'กันยายน': 8, 'ตุลาคม': 9, 'พฤศจิกายน': 10, 'ธันวาคม': 11,
      
      // English abbreviated
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3,
      'may': 4, 'jun': 5, 'jul': 6, 'aug': 7,
      'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
      
      // English full (may is already defined in abbreviated)
      'january': 0, 'february': 1, 'march': 2, 'april': 3,
      'june': 5, 'july': 6, 'august': 7,
      'september': 8, 'october': 9, 'november': 10, 'december': 11
    };

    // Clean up month string and try to match
    const monthKey = month.toLowerCase().trim();
    let monthNum: number | undefined;

    // Try direct mapping first
    monthNum = monthMap[monthKey];

    // If not found, try numeric month
    if (monthNum === undefined && !isNaN(parseInt(month))) {
      monthNum = parseInt(month) - 1; // Convert to 0-based month
      if (monthNum < 0 || monthNum > 11) return null;
    }

    // If still not found, return null
    if (monthNum === undefined) return null;

    // Handle 2-digit years before parsing
    if (year.length === 2) {
      const twoDigitYear = parseInt(year);
      year = (twoDigitYear < 50 ? '20' : '19') + year;
    }

    // Convert and validate all parts to numbers
    const dayNum = parseInt(day);
    const yearNum = parseInt(year);

    // Final validations
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      return null;
    }
    if (isNaN(yearNum)) {
      return null;
    }

    return new Date(yearNum, monthNum, dayNum);
  }

  // Helper to get ISO week number
  function getISOWeek(date: Date): number {
    const tmpDate = new Date(date.getTime());
    tmpDate.setHours(0, 0, 0, 0);
    tmpDate.setDate(tmpDate.getDate() + 4 - (tmpDate.getDay() || 7));
    const yearStart = new Date(tmpDate.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((tmpDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
  }

  const weekWorkload: Record<number, number> = {};
  tasks.forEach(task => {
    let date: Date | null = null;
    
    // Try parsing dueDate directly or from Timestamp
    if (task.dueDate instanceof Timestamp) {
      date = new Date(task.dueDate.seconds * 1000);
    } else if (typeof task.dueDate === 'string') {
      date = parseMultiFormatDate(task.dueDate);
    }
    
    if (date) {
      const week = getISOWeek(date);
      // ถ้าไม่มีค่า estWorkload ให้ใช้ค่าเริ่มต้นเป็น 8 ชั่วโมง
      const workload = Number(task.estWorkload) || 8;
      
      // เพิ่มค่า workload เข้าไปในสัปดาห์นั้นๆ
      weekWorkload[week] = (weekWorkload[week] || 0) + workload;
      
      // Calculate and store workload values
      const currentTotal = weekWorkload[week];
    } else {
      console.log("Could not parse date for task:", task.taskName);
    }
  });

  console.log("Final weekWorkload:", weekWorkload);

  // Return array for chart: [{ week: 1, workload: 100 }, ...]
  return Array.from({ length: 52 }, (_, i) => ({
    week: i + 1,
    workload: weekWorkload[i + 1] || 0
  }));
};