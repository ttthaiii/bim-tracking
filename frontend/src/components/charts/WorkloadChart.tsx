import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { getWorkloadByWeek, fetchProjects } from '@/services/firebase'; // Import fetchProjects
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

// No longer needs props
export default function WorkloadChart() {
  const { selectedProject, excludedStatuses } = useDashboard(); // Get selectedProject from context
  
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

        // If a project is selected in the dashboard, find its ID
        if (selectedProject && selectedProject !== 'all') {
            const allProjects = await fetchProjects();
            const project = allProjects.find(p => p.name === selectedProject);
            if (project) {
                projectIdForFilter = project.id;
            } else {
                 // If project name not found, show no data to be safe
                 setChartData({ labels: [], datasets: [{ label: 'Estimated Workload (Hours)', data: [], borderColor: 'rgb(75, 192, 192)', tension: 0.1 }] });
                 return;
            }
        }

        // Fetch workload data with the correct project ID and excluded statuses
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
  }, [selectedProject, excludedStatuses]); // Add selectedProject to the dependency array

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
