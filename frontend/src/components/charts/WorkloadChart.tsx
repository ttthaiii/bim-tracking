import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
// 1. แก้ไข: เปลี่ยนชื่อฟังก์ชันที่ import และ import Project Type เข้ามาด้วย
import { getWorkloadByWeek, getProjectDetails } from '@/services/firebase'; 
import { Project } from '@/types/database'; 
import { useDashboard } from '@/context/DashboardContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function WorkloadChart() {
  const { selectedProject, excludedStatuses } = useDashboard();
  
  interface WorkloadChartData {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor?: string;
      borderWidth?: number;
      fill?: boolean;
      tension: number;
    }[];
  }

  const [chartData, setChartData] = useState<WorkloadChartData>({
    labels: [],
    datasets: [{
      label: 'Estimated Workload (Hours)',
      data: [],
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        let projectIdForFilter: string | undefined = undefined;

        if (selectedProject && selectedProject !== 'all') {
            // 2. แก้ไข: เรียกใช้ฟังก์ชันด้วยชื่อใหม่
            const allProjects = await getProjectDetails();
            // 3. แก้ไข: เพิ่ม Type (p: Project) ให้กับ parameter
            const project = allProjects.find((p: Project) => p.name === selectedProject);
            if (project) {
                projectIdForFilter = project.id;
            } else {
                setChartData({ labels: [], datasets: [{ label: 'Estimated Workload (Hours)', data: [], borderColor: 'rgb(75, 192, 192)', tension: 0.1 }] });
                return;
            }
        }

        const workloadData = await getWorkloadByWeek(projectIdForFilter, excludedStatuses);
        
        setChartData({
          labels: workloadData.map(w => `สัปดาห์ที่ ${w.week}`),
          datasets: [{
            label: 'Estimated Workload (Hours)',
            data: workloadData.map(w => w.workload),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
          }]
        });
      } catch (error) {
        console.error("Error fetching workload data:", error);
      }
    };

    fetchData();
  }, [selectedProject, excludedStatuses]);

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
        text: 'Workload Distribution by Week',
        font: {
          size: 16
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'จำนวนชั่วโมงการทำงาน'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Week'
        }
      }
    }
  };

  return (
    <div style={{ height: '400px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
}