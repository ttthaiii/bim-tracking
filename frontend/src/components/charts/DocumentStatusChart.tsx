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
  ChartData,
  Point,
  BubbleDataPoint,
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

// --- แก้ไข: ระบุ Type ของ Label ให้เป็น string ---
type BarChartData = ChartData<'bar', (number | [number, number] | Point | BubbleDataPoint | null)[], string>;
type BarChart = ChartJS<'bar', (number | [number, number] | Point | BubbleDataPoint | null)[], string>;


export default function DocumentStatusChart() {
  const [chartData, setChartData] = useState<BarChartData>({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  const { selectedProject, setSelectedProject, excludedStatuses, toggleStatus, selectOnlyStatus, setExcludedStatuses } = useDashboard();
  
  const chartRef = useRef<BarChart>(null);
  const legendClickTimeout = useRef<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let summaries = await getTasksByStatus();

        if (selectedProject && selectedProject !== 'all') {
          summaries = summaries.filter(s => s.projectName === selectedProject);
        }

        if (summaries.length > 0) {
          const labels = summaries.map(s => s.projectName);
          
          const datasets = ALL_STATUSES.map(status => ({
            label: status,
            data: summaries.map(s => s.taskCounts[status] || 0),
            backgroundColor: STATUS_COLORS[status],
            hidden: excludedStatuses.includes(status)
          }));

          setChartData({ labels, datasets });
        } else {
            setChartData({ labels: [], datasets: [] });
        }
      } catch (error) {
        console.error('Error processing chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedProject, excludedStatuses]);

  const handleChartClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!chartRef.current) return;
    const elements = getElementAtEvent(chartRef.current, event);

    if (elements.length > 0) {
      const { index } = elements[0];
      const labels = chartData.labels;
      if (labels) {
        const projectName = labels[index];
        const newValue = selectedProject === projectName ? null : projectName;
        setSelectedProject(newValue);
      }
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
        setExcludedStatuses([]);
      } else {
        selectOnlyStatus(status);
      }
    } else {
      legendClickTimeout.current = window.setTimeout(() => {
        toggleStatus(status);
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
          callback: function(this: any, value: any): string {
            const label = this.getLabelForValue(value);
            if (typeof label === 'string' && label.length > 15) {
              return label.substring(0, 15) + '...';
            }
            return label || '';
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