import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Task } from '@/types/database';
import { useDashboard } from '@/context/DashboardContext';
import { getTaskStatusCategory, TaskStatusCategory } from '@/services/dashboardService';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Status colors matching the Pie Chart for consistency
const STATUS_COLORS: Record<TaskStatusCategory, { background: string; border: string }> = {
  'เสร็จสิ้น': { background: 'rgba(16, 185, 129, 0.8)', border: 'rgba(16, 185, 129, 1)' },
  'รออนุมัติจาก CM': { background: 'rgba(239, 68, 68, 0.8)', border: 'rgba(239, 68, 68, 1)' },
  'รอตรวจสอบหน้างาน': { background: 'rgba(245, 158, 11, 0.8)', border: 'rgba(245, 158, 11, 1)' },
  'รอแก้ไขแบบ BIM': { background: 'rgba(249, 115, 22, 0.8)', border: 'rgba(249, 115, 22, 1)' },
  'กำลังดำเนินการ-BIM': { background: 'rgba(211, 211, 211, 0.8)', border: 'rgba(211, 211, 211, 1)' },
  'วางแผนแล้ว-BIM': { background: 'rgba(169, 169, 169, 0.8)', border: 'rgba(169, 169, 169, 1)' },
  'ยังไม่วางแผน-BIM': { background: 'rgba(105, 105, 105, 0.8)', border: 'rgba(105, 105, 105, 1)' },
};

const ALL_STATUS_LABELS = Object.keys(STATUS_COLORS) as TaskStatusCategory[];

interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor: string | string[];
  borderColor: string | string[];
  borderWidth: number;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

// The component no longer needs props, it gets everything from the context
export default function ProjectProgressChart() {
  const { selectedProject, excludedStatuses } = useDashboard();
  const [chartData, setChartData] = useState<ChartData>({ labels: [], datasets: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsSnap, tasksSnap] = await Promise.all([
          getDocs(collection(db, 'projects')),
          getDocs(collection(db, 'tasks')),
        ]);

        const projectsMap = new Map<string, string>();
        projectsSnap.forEach(doc => projectsMap.set(doc.id, doc.data().name || doc.id));

        const projectStatusCount: Record<string, Record<string, number>> = {};
        projectsMap.forEach((_, projectId) => {
          projectStatusCount[projectId] = {}; // Initialize for all projects
        });

        tasksSnap.forEach(doc => {
          const task = doc.data() as Task;
          const status = getTaskStatusCategory(task);

          // Filter by status based on context
          if (excludedStatuses.includes(status)) {
            return;
          }

          if (task.projectId && projectStatusCount[task.projectId]) {
            projectStatusCount[task.projectId][status] = (projectStatusCount[task.projectId][status] || 0) + 1;
          }
        });

        const projectLabels = Array.from(projectsMap.values());

        const datasets: ChartDataset[] = ALL_STATUS_LABELS.map(status => {
          const baseColor = STATUS_COLORS[status]?.background || 'rgba(201, 203, 207, 0.5)';
          const dimmedColor = baseColor.replace('0.8', '0.2'); // Make it more transparent

          const backgroundColors = projectLabels.map(label => {
            const isProjectSelected = selectedProject && selectedProject !== 'all';
            if (!isProjectSelected || label === selectedProject) {
              return baseColor; // Full color if no selection or it's the selected one
            } else {
              return dimmedColor; // Dim color for other projects
            }
          });
          
          const borderColors = backgroundColors.map(color => color.replace('0.8', '1').replace('0.2','1'));

          return {
            label: status,
            data: Array.from(projectsMap.keys()).map(projectId => projectStatusCount[projectId]?.[status] || 0),
            backgroundColor: backgroundColors,
            borderColor: borderColors, // Apply the same logic for borders if needed
            borderWidth: 1
          };
        });

        setChartData({ labels: projectLabels, datasets });
      } catch (error) {
        console.error("Error fetching project document count:", error);
      }
    };
    fetchData();
  }, [selectedProject, excludedStatuses]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hiding the default legend, as the Pie chart's legend controls this
      },
      title: {
        display: true,
        text: 'จำนวนเอกสารแยกตามโครงการ',
        font: { size: 16, weight: 700 },
        padding: { top: 10, bottom: 20 }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false
        }
      },
      y: {
        stacked: true,
        beginAtZero: true,
        title: {
          display: true,
          text: 'จำนวนเอกสาร'
        }
      }
    },
  };

  return (
    <div className="h-[450px]">
      <Bar data={chartData} options={options} />
    </div>
  );
}
