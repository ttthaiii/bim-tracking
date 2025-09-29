import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Task } from '@/types/database';

export interface TaskStatusCount {
  CM: number;
  BIM: number;
  SITE: number;
  อนุมัติ: number;
  'กำลังดำเนินการ-BIM': number;
  'วางแผนแล้ว-BIM': number;
  'ยังไม่วางแผน-BIM': number;
  total: number;
  totalEstWorkload: number;
  totalCurrentWorkload: number;
}

export interface ProjectTaskSummary {
  projectName: string;
  taskCounts: TaskStatusCount;
}

export async function getTasksByStatus(): Promise<ProjectTaskSummary[]> {
  try {
    const tasksRef = collection(db, 'tasks');
    const snapshot = await getDocs(tasksRef);
    const projectTasks = new Map<string, TaskStatusCount>();

    snapshot.forEach((doc) => {
      const task = doc.data() as Task;
      const projectId = task.projectId;

      if (!projectTasks.has(projectId)) {
        projectTasks.set(projectId, {
          CM: 0,
          BIM: 0,
          SITE: 0,
          อนุมัติ: 0,
          'กำลังดำเนินการ-BIM': 0,
          'วางแผนแล้ว-BIM': 0,
          'ยังไม่วางแผน-BIM': 0,
          total: 0,
          totalEstWorkload: 0,
          totalCurrentWorkload: 0
        });
      }

      const counts = projectTasks.get(projectId)!;
      counts.total++;

      // แปลงสถานะเป็นหมวดหมู่ตามที่ต้องการ
      switch(task.currentStep) {
        case 'APPROVED':
        case 'APPROVED_WITH_COMMENTS':
          counts.อนุมัติ++;
          break;
        
        case 'REJECTED':
        case 'APPROVED_REVISION_REQUIRED':
        case 'REVISION_REQUIRED':
          counts.BIM++;
          break;
        
        case 'PENDING_CM_APPROVAL':
          counts.CM++;
          break;
        
        case 'PENDING_REVIEW':
          counts.SITE++;
          break;
        
        case 'Unknown':
        default:
          // ตรวจสอบค่า subtaskCount และ totalMH
          const subtaskCount = task.subtaskCount || 0;
          const totalMH = task.totalMH || 0;

          // ตรวจสอบเงื่อนไขเพิ่มเติมสำหรับงานที่ไม่ระบุสถานะ
          if (subtaskCount > 1) {
            if (totalMH > 0) {
              counts['กำลังดำเนินการ-BIM']++;
            } else {
              counts['วางแผนแล้ว-BIM']++;
            }
          } else if (subtaskCount === 0) {
            counts['ยังไม่วางแผน-BIM']++;
          }

          // อัพเดต workload totals
          counts.totalEstWorkload += task.estWorkload || 0;
          counts.totalCurrentWorkload += totalMH;
          break;
      }
    });

    // Convert Map to array of ProjectTaskSummary
    const summaries: ProjectTaskSummary[] = [];
    for (const [projectId, counts] of projectTasks.entries()) {
      summaries.push({
        projectName: projectId,
        taskCounts: counts
      });
    }

    return summaries;
  } catch (error) {
    console.error('Error fetching task status:', error);
    return [];
  }
}