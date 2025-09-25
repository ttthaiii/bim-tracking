import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
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

export default function ProjectProgressChart() {
  const [chartData, setChartData] = useState({
    labels: [
      'Kios', 
      'Image-10', 
      'ART-1', 
      'BLOOM NESS HOSPITAL', 
      'DH2-IP11', 
      'Valley Haus',
      'Bim room',
      'V-Bangkok-S'
    ],
    datasets: [{
      label: 'Project Progress (%)',
      data: [85, 65, 15, 20, 30, 40, 25, 15],
      backgroundColor: 'rgba(54, 162, 235, 0.8)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }]
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tasksRef = collection(db, 'tasks');
        const snapshot = await getDocs(tasksRef);
        const projectProgress = new Map<string, { total: number; completed: number }>();

        snapshot.forEach((doc) => {
          const task = doc.data();
          if (!projectProgress.has(task.projectId)) {
            projectProgress.set(task.projectId, { total: 0, completed: 0 });
          }
          const progress = projectProgress.get(task.projectId)!;
          progress.total++;
          progress.completed += task.progress || 0;
        });

        // Convert to array and calculate percentages
        const progressData = Array.from(projectProgress.entries()).map(([projectId, data]) => ({
          projectId,
          progress: (data.completed / data.total) * 100
        }));

        setChartData(prev => ({
          ...prev,
          datasets: [{
            ...prev.datasets[0],
            data: progressData.map(p => Math.round(p.progress))
          }]
        }));
      } catch (error) {
        console.error("Error fetching project progress:", error);
      }
    };

    fetchData();
  }, []);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Project Progress Overview',
        font: {
          size: 16
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Project Progress (%)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className="h-[300px]">
      <Bar data={chartData} options={options} />
    </div>
  );
}