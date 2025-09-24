import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { getProjectProgress } from '@/services/firebase';
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
    labels: [],
    datasets: [{
      label: 'Project Progress (%)',
      data: [],
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }]
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectProgress = await getProjectProgress();
        
        setChartData({
          labels: projectProgress.map(p => p.projectName),
          datasets: [{
            label: 'Project Progress (%)',
            data: projectProgress.map(p => p.progress),
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        });
      } catch (error) {
        console.error("Error fetching project progress:", error);
      }
    };

    fetchData();
  }, []);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Project Progress Overview'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <Bar data={chartData} options={options} />
    </div>
  );
}