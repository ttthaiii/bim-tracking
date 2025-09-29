import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
// Removed duplicate import of Bar

interface ProjectChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
  }[];
}
import { Bar } from 'react-chartjs-2';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Task } from '@/types/database';
import { db } from '@/config/firebase';
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ProjectProgressChartProps {
  projectId?: string;
}

export default function ProjectProgressChart({ projectId }: ProjectProgressChartProps) {
  
    interface ProjectChartData {
      labels: string[];
      datasets: {
        label: string;
        data: number[];
        backgroundColor: string;
        borderColor: string;
        borderWidth: number;
      }[];
    }

    const [chartData, setChartData] = useState<ProjectChartData>({
      labels: [],
      datasets: [
        {
          label: 'Document Count',
          data: [],
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ดึง projects ทั้งหมด
        const projectsRef = collection(db, 'projects');
        const projectsSnap = await getDocs(projectsRef);
        const projectsMap = new Map();
        projectsSnap.forEach(doc => {
          const project = doc.data();
          projectsMap.set(doc.id, project.name || doc.id);
        });

        // ดึง tasks ตาม projectId (ถ้ามี)
        const tasksRef = collection(db, 'tasks');
        const tasksSnap = await getDocs(
          projectId 
            ? query(tasksRef, where('projectId', '==', projectId))
            : tasksRef
        );

        // Group by projectId and status
        const projectStatusCount: Record<string, Record<string, number>> = {};
        tasksSnap.forEach(doc => {
          const task = doc.data();
          if (task.projectId && projectsMap.has(task.projectId)) {
            if (!projectStatusCount[task.projectId]) {
              projectStatusCount[task.projectId] = {};
            }
            const status = task.currentStatus || 'ไม่ระบุ';
            projectStatusCount[task.projectId][status] = (projectStatusCount[task.projectId][status] || 0) + 1;
          }
        });

        // Get unique statuses
        const allStatuses = new Set<string>();
        Object.values(projectStatusCount).forEach(statusMap => {
          Object.keys(statusMap).forEach(status => allStatuses.add(status));
        });

        // สร้าง labels จาก projectName ที่มีจริง
        const labels = Object.keys(projectStatusCount).map(pid => projectsMap.get(pid) || pid) as string[];
        
        // สร้าง datasets แยกตาม status
        const statusColors: Record<string, { bg: string, border: string }> = {
          'In Progress': { bg: 'rgba(54, 162, 235, 0.5)', border: 'rgba(54, 162, 235, 1)' },
          'Review': { bg: 'rgba(255, 206, 86, 0.5)', border: 'rgba(255, 206, 86, 1)' },
          'Complete': { bg: 'rgba(75, 192, 192, 0.5)', border: 'rgba(75, 192, 192, 1)' },
          'Not Started': { bg: 'rgba(201, 203, 207, 0.5)', border: 'rgba(201, 203, 207, 1)' },
          'ไม่ระบุ': { bg: 'rgba(255, 159, 64, 0.5)', border: 'rgba(255, 159, 64, 1)' }
        };

        const datasets = Array.from(allStatuses).map(status => ({
          label: status,
          data: labels.map(projectName => {
            const projectId = Array.from(projectsMap.entries())
              .find(([, name]) => name === projectName)?.[0] || '';
            return projectStatusCount[projectId]?.[status] || 0;
          }),
          backgroundColor: statusColors[status]?.bg || 'rgba(201, 203, 207, 0.5)',
          borderColor: statusColors[status]?.border || 'rgba(201, 203, 207, 1)',
          borderWidth: 1
        }));

        setChartData(prev => ({
          ...prev,
          labels,
          datasets
        }));
      } catch (error) {
        console.error("Error fetching project document count:", error);
      }
    };
    fetchData();
  }, [projectId]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'จำนวนเอกสารแยกตามโครงการ',
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          footer: (tooltipItems: any[]) => {
            // Calculate total from all datasets for this project
            const total = tooltipItems.reduce((sum, tooltipItem) => 
              sum + Number(tooltipItem.parsed.y || 0), 0
            );
            return `รวมทั้งหมด: ${total} ฉบับ`;
          }
        }
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
    // scales config moved above
  };

  return (
    <div className="h-[300px]">
      <Bar data={chartData} options={options} />
    </div>
  );
}