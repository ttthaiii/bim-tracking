import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { getWorkloadByAssignee } from '@/services/firebase';
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

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    tension: number;
  }[];
}

export default function WorkloadChart() {
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    datasets: [{
      label: 'Estimated Workload (Days)',
      data: [],
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const workloadData = await getWorkloadByAssignee();
        
        setChartData({
          labels: workloadData.map(w => w.assignee),
          datasets: [{
            label: 'Estimated Workload (Days)',
            data: workloadData.map(w => w.workload),
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }]
        });
      } catch (error) {
        console.error("Error fetching workload data:", error);
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
        text: 'Workload Distribution by Assignee'
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <Line data={chartData} options={options} />
    </div>
  );
}