import { useState, useEffect, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartElement
} from 'chart.js';
import { getTasksByStatus, ProjectTaskSummary, TaskStatusCount } from '@/services/taskStatus';
import { useDashboard } from '@/context/DashboardContext';
import { getElementAtEvent } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const STATUS_COLORS: Record<keyof Omit<TaskStatusCount, 'total' | 'totalEstWorkload' | 'totalCurrentWorkload'>, string> = {
  'เสร็จสิ้น': '#10B981',
  'รออนุมัติจาก CM': '#EF4444',
  'รอตรวจสอบหน้างาน': '#F59E0B',
  'รอแก้ไขแบบ BIM': '#F97316',
  'กำลังดำเนินการ-BIM': '#14B8A6',
  'วางแผนแล้ว-BIM': '#3B82F6',
  'ยังไม่วางแผน-BIM': '#8B5CF6',
};

export default function DocumentStatusChart() {
  const [chartData, setChartData] = useState<any>({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  const { setSelectedProject } = useDashboard();
  const chartRef = useRef<ChartJS>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const summaries = await getTasksByStatus();

        if (summaries.length > 0) {
          const labels = summaries.map(s => s.projectName);
          const statuses = Object.keys(STATUS_COLORS) as (keyof typeof STATUS_COLORS)[];

          const datasets = statuses.map(status => ({
            label: status,
            data: summaries.map(s => s.taskCounts[status] || 0),
            backgroundColor: STATUS_COLORS[status],
          }));

          setChartData({ labels, datasets });
        }
      } catch (error) {
        console.error('Error processing chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!chartRef.current) return;
    const elements = getElementAtEvent(chartRef.current, event);

    if (elements.length > 0) {
      const { index } = elements[0];
      const projectName = chartData.labels[index];
      setSelectedProject(prev => (prev === projectName ? null : projectName));
    }
  };

  const options: any = {
    plugins: {
      title: {
        display: true,
        text: 'จำนวนเอกสารแยกตามโครงการ',
        font: { size: 16, weight: '700' },
        padding: { top: 10, bottom: 10 } // Consistent title padding
      },
      legend: {
        display: true,
        position: 'bottom' as const,
        align: 'start',
        labels: { 
          padding: 20, // Consistent legend item padding
          usePointStyle: true,
          pointStyle: 'circle',
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    layout: {
      padding: {
        bottom: 5
      }
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        ticks: {
          autoSkip: false,
          maxRotation: 45,
          minRotation: 45,
          callback: function(value: any) {
            const label = this.getLabelForValue(value);
            if (typeof label === 'string' && label.length > 15) {
              return label.substring(0, 15) + '...';
            }
            return label;
          }
        }
      },
      y: {
        stacked: true,
        beginAtZero: true,
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[450px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-[450px]">
      <Bar ref={chartRef} options={options} data={chartData} onClick={handleClick} />
    </div>
  );
}
