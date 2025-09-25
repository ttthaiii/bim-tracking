import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { getTasksByStatus, ProjectTaskSummary } from '@/services/dashboardService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function DocumentStatusChart() {
  const [data, setData] = useState<ProjectTaskSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const summaries = await getTasksByStatus();
        setData(summaries);
      } catch (error) {
        console.error('Error fetching document status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const chartData = {
    labels: data.map(summary => summary.projectName),
    datasets: [
      {
        label: 'CM',
        data: data.map(summary => summary.taskCounts.CM),
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'BIM',
        data: data.map(summary => summary.taskCounts.BIM),
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
      },
      {
        label: 'SITE',
        data: data.map(summary => summary.taskCounts.SITE),
        backgroundColor: 'rgba(255, 205, 86, 0.5)',
      },
      {
        label: 'อนุมัติ',
        data: data.map(summary => summary.taskCounts.อนุมัติ),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      }
    ]
  };

  const options = {
    plugins: {
      title: {
        display: true,
        text: 'สัดส่วนแบบก่อสร้างแยกตามโครงการ'
      },
    },
    responsive: true,
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <Bar options={options} data={chartData} />
    </div>
  );
}