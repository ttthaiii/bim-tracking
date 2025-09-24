import { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

export default function ProjectStatusChart() {
  const [chartData, setChartData] = useState({
    labels: ['In Progress', 'Completed', 'Pending'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: [
        'rgba(54, 162, 235, 0.5)',
        'rgba(75, 192, 192, 0.5)',
        'rgba(255, 206, 86, 0.5)',
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(255, 206, 86, 1)',
      ],
      borderWidth: 1,
    }]
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectsRef = collection(db, 'projects');
        const snapshot = await getDocs(projectsRef);
        
        let inProgress = 0;
        let completed = 0;
        let pending = 0;

        snapshot.forEach((doc) => {
          const status = doc.data().status;
          if (status === 'in_progress') inProgress++;
          else if (status === 'completed') completed++;
          else if (status === 'pending') pending++;
        });

        setChartData(prev => ({
          ...prev,
          datasets: [{
            ...prev.datasets[0],
            data: [inProgress, completed, pending]
          }]
        }));
      } catch (error) {
        console.error("Error fetching project status data:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4">Project Status Distribution</h3>
      <Pie data={chartData} />
    </div>
  );
}