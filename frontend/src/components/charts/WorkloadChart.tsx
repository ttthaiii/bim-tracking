import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { getWorkloadByWeek } from '@/services/firebase';
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

interface WorkloadChartProps {
  projectId?: string;
}

export default function WorkloadChart({ projectId }: WorkloadChartProps) {
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
        console.log("Fetching workload data for projectId:", projectId);
        const workloadData = await getWorkloadByWeek(projectId);
        console.log("Received workload data:", workloadData);
        setChartData({
          labels: workloadData.map(w => `สัปดาห์ที่ ${w.week}`),
          datasets: [{
            label: 'Estimated Workload (Hours)',
            data: workloadData.map(w => w.workload),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.1
          }]
        });
      } catch (error) {
        console.error("Error fetching workload data:", error);
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