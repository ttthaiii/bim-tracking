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
} from 'chart.js';
import { getTasksByStatus, TaskStatusCount } from '@/services/taskStatus';
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
  'กำลังดำเนินการ-BIM': '#D3D3D3',
  'วางแผนแล้ว-BIM': '#A9A9A9',
  'ยังไม่วางแผน-BIM': '#696969',
};

const ALL_STATUSES = Object.keys(STATUS_COLORS) as (keyof typeof STATUS_COLORS)[];

export default function DocumentStatusChart() {
  const [chartData, setChartData] = useState<any>({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  // Using selectedProject from the context
  const { selectedProject, setSelectedProject, excludedStatuses, toggleStatus, selectOnlyStatus, setExcludedStatuses } = useDashboard();
  const chartRef = useRef<ChartJS>(null);
  const legendClickTimeout = useRef<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let summaries = await getTasksByStatus();

        // Filter summaries by selectedProject from context
        if (selectedProject && selectedProject !== 'all') {
          summaries = summaries.filter(s => s.projectName === selectedProject);
        }

        if (summaries.length > 0) {
          const labels = summaries.map(s => s.projectName);
          
          const datasets = ALL_STATUSES.map(status => ({
            label: status,
            data: summaries.map(s => s.taskCounts[status] || 0),
            backgroundColor: STATUS_COLORS[status],
            // The `hidden` property is the correct way to toggle visibility in Chart.js
            hidden: excludedStatuses.includes(status)
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
  }, [selectedProject, excludedStatuses]); // Added selectedProject to dependency array

  const handleChartClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!chartRef.current) return;
    const elements = getElementAtEvent(chartRef.current, event);

    if (elements.length > 0) {
      const { index } = elements[0];
      const projectName = chartData.labels[index];
      // Toggle project selection in the context
      setSelectedProject(prev => (prev === projectName ? null : projectName));
    }
  };

  const handleLegendClick = (e: any, legendItem: any) => {
    const status = legendItem.text;

    if (legendClickTimeout.current) {
      clearTimeout(legendClickTimeout.current);
      legendClickTimeout.current = null;
      
      const isAlreadySingleSelected = 
        excludedStatuses.length === ALL_STATUSES.length - 1 && 
        !excludedStatuses.includes(status);

      if (isAlreadySingleSelected) {
        setExcludedStatuses([]); // Show all
      } else {
        selectOnlyStatus(status); // Show only this one
      }
    } else {
      legendClickTimeout.current = window.setTimeout(() => {
        toggleStatus(status); // Toggle visibility
        legendClickTimeout.current = null;
      }, 250);
    }
  };

  const options: any = {
    plugins: {
      title: {
        display: true,
        text: 'จำนวนเอกสารแยกตามโครงการ',
        font: { size: 16, weight: '700' },
        padding: { top: 10, bottom: 10 }
      },
      legend: {
        display: true,
        position: 'bottom' as const,
        align: 'start',
        labels: { 
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
        onClick: handleLegendClick,
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
      <Bar ref={chartRef} options={options} data={chartData} onClick={handleChartClick} />
    </div>
  );
}
