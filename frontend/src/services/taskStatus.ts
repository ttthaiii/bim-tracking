import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Task } from '@/types/database';
import { getTaskStatusCategory, TaskStatusCategory } from './dashboardService'; // Import for consistency

// 1. Redefine TaskStatusCount to match the real statuses from Donut Chart & Table
export type TaskStatusCount = Record<TaskStatusCategory, number> & {
  total: number;
  totalEstWorkload: number;
  totalCurrentWorkload: number;
};

export interface ProjectTaskSummary {
  projectName: string;
  taskCounts: TaskStatusCount;
}

// Helper to create an empty count object
const createEmptyTaskStatusCount = (): TaskStatusCount => ({
  'เสร็จสิ้น': 0,
  'รออนุมัติจาก CM': 0,
  'รอตรวจสอบหน้างาน': 0,
  'รอแก้ไขแบบ BIM': 0,
  'กำลังดำเนินการ-BIM': 0,
  'วางแผนแล้ว-BIM': 0,
  'ยังไม่วางแผน-BIM': 0,
  total: 0,
  totalEstWorkload: 0,
  totalCurrentWorkload: 0,
});

export async function getTasksByStatus(): Promise<ProjectTaskSummary[]> {
  try {
    // 2. Fetch all projects to map ID to Name (like in dashboardService)
    const projectsRef = collection(db, 'projects');
    const projectsSnapshot = await getDocs(projectsRef);
    const projectsMap = new Map<string, string>();
    projectsSnapshot.forEach(doc => {
      projectsMap.set(doc.id, doc.data().name);
    });

    const tasksRef = collection(db, 'tasks');
    const snapshot = await getDocs(tasksRef);
    const projectTasks = new Map<string, TaskStatusCount>();

    snapshot.forEach((doc) => {
      const task = doc.data() as Task;
      const projectId = task.projectId;

      // Initialize the counter for a new project
      if (!projectTasks.has(projectId)) {
        projectTasks.set(projectId, createEmptyTaskStatusCount());
      }

      const counts = projectTasks.get(projectId)!;
      counts.total++;
      counts.totalEstWorkload += task.estWorkload || 0;
      counts.totalCurrentWorkload += task.totalMH || 0;

      // 3. Use the single source of truth for status categorization
      const status = getTaskStatusCategory(task);
      counts[status]++;
    });

    // 4. Convert the Map to the final array, using correct project names
    const summaries: ProjectTaskSummary[] = [];
    for (const [projectId, counts] of projectTasks.entries()) {
      summaries.push({
        projectName: projectsMap.get(projectId) || projectId, // Use real name, fallback to ID
        taskCounts: counts
      });
    }

    // Sort by project name for a consistent order
    return summaries.sort((a, b) => a.projectName.localeCompare(b.projectName));
    
  } catch (error) {
    console.error('Error fetching task status by project:', error);
    return [];
  }
}
