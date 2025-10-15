import { useState, useEffect, useRef } from 'react';
import { Pie } from 'react-chartjs-2';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Task } from '@/types/database';
import { getTaskStatusCategory, TaskStatusCategory } from '@/services/dashboardService';
import { useDashboard } from '@/context/DashboardContext';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const STATUS_COLORS: Record<TaskStatusCategory, { background: string; border: string }> = {
  'เสร็จสิ้น': { background: 'rgba(16, 185, 129, 0.8)', border: 'rgba(16, 185, 129, 1)' },
  'รออนุมัติจาก CM': { background: 'rgba(239, 68, 68, 0.8)', border: 'rgba(239, 68, 68, 1)' },
  'รอตรวจสอบหน้างาน': { background: 'rgba(245, 158, 11, 0.8)', border: 'rgba(245, 158, 11, 1)' },
  'รอแก้ไขแบบ BIM': { background: 'rgba(249, 115, 22, 0.8)', border: 'rgba(249, 115, 22, 1)' },
  'กำลังดำเนินการ-BIM': { background: 'rgba(211, 211, 211, 0.8)', border: 'rgba(211, 211, 211, 1)' },
  'วางแผนแล้ว-BIM': { background: 'rgba(169, 169, 169, 0.8)', border: 'rgba(169, 169, 169, 1)' },
  'ยังไม่วางแผน-BIM': { background: 'rgba(105, 105, 105, 0.8)', border: 'rgba(105, 105, 105, 1)' },
};

const ALL_STATUS_LABELS = Object.keys(STATUS_COLORS) as TaskStatusCategory[];

export default function ProjectStatusChart() {
  const { selectedProject, selectedStatus, setSelectedStatus, excludedStatuses, toggleStatus, selectOnlyStatus } = useDashboard();
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [{ data: [] }]
  });
  // This state now correctly represents the number shown in the middle of the donut
  const [displayedTotal, setDisplayedTotal] = useState(0);
  const [title, setTitle] = useState('สถานะเอกสาร (ทั้งหมด)');
  const legendClickTimeout = useRef<number | null>(null);
  // Use a ref to store the grand total for accurate percentage calculations in tooltips
  const grandTotalRef = useRef(0);

  useEffect(() => {
    const fetchDataAndBuildChart = async () => {
      try {
        const [tasksSnapshot, projectsSnapshot] = await Promise.all([
          getDocs(collection(db, 'tasks')),
          getDocs(collection(db, 'projects')),
        ]);

        const projectsMap = new Map<string, string>();
        projectsSnapshot.forEach(doc => projectsMap.set(doc.id, doc.data().name));

        const statusMap = Object.fromEntries(ALL_STATUS_LABELS.map(label => [label, 0])) as Record<TaskStatusCategory, number>;

        tasksSnapshot.forEach((doc) => {
          const task = doc.data() as Task;
          const projectName = projectsMap.get(task.projectId) || task.projectId;

          if (selectedProject && selectedProject !== 'all' && projectName !== selectedProject) {
            return;
          }

          const status = getTaskStatusCategory(task);
          if (status in statusMap) {
            statusMap[status]++;
          }
        });

        // Store the true grand total for percentage calculations
        grandTotalRef.current = Object.values(statusMap).reduce((a, b) => a + b, 0);
        
        const visibleLabels = ALL_STATUS_LABELS.filter(label => !excludedStatuses.includes(label));
        const visibleData: number[] = [];
        const visibleBackgroundColors: string[] = [];
        const visibleBorderColors: string[] = [];
        
        // This total is now only for the currently visible (filtered) documents
        let visibleTotal = 0;

        visibleLabels.forEach(label => {
          const count = statusMap[label];
          visibleData.push(count);
          visibleTotal += count; // Sum up the counts of visible items
          
          visibleBorderColors.push(STATUS_COLORS[label].border);
          const originalColor = STATUS_COLORS[label].background;

          const isSingleSelected = excludedStatuses.length === ALL_STATUS_LABELS.length - 1 && !excludedStatuses.includes(label);

          if (!selectedStatus && !isSingleSelected) {
             visibleBackgroundColors.push(originalColor);
          } else if (isSingleSelected) {
             visibleBackgroundColors.push(originalColor.replace('0.8', '1'));
          } else {
             visibleBackgroundColors.push(
              label === selectedStatus 
                ? originalColor.replace('0.8', '1')
                : originalColor.replace('0.8', '0.3')
            );
          }
        });

        setChartData({
          labels: visibleLabels,
          datasets: [{
            label: 'จำนวนเอกสาร',
            data: visibleData,
            backgroundColor: visibleBackgroundColors,
            borderColor: visibleBorderColors,
            borderWidth: 1,
          }]
        });

        // Update the displayed number in the center to reflect the filtered total
        setDisplayedTotal(visibleTotal);
        setTitle(`สถานะเอกสาร (${(projectsMap.get(selectedProject || '') || 'ทั้งหมด')})`);

      } catch (error) {
        console.error('Error during chart data processing:', error);
      }
    };

    fetchDataAndBuildChart();
  }, [selectedProject, excludedStatuses, selectedStatus]);

  const handleChartClick = (event: any, elements: any[]) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const status = chartData.labels[index];
      selectOnlyStatus(status);
      setSelectedStatus(prev => (status === prev ? null : status));
    }
  };

  const handleLegendClick = (e: any, legendItem: any) => {
    const status = legendItem.text;
    if (selectedStatus) setSelectedStatus(null);

    if (legendClickTimeout.current) {
      clearTimeout(legendClickTimeout.current);
      legendClickTimeout.current = null;
      selectOnlyStatus(status);
    } else {
      legendClickTimeout.current = window.setTimeout(() => {
        toggleStatus(status);
        legendClickTimeout.current = null;
      }, 250);
    }
  };

  const options: any = {
    onClick: handleChartClick,
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        align: 'start',
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          generateLabels: (chart: ChartJS) => ALL_STATUS_LABELS.map(label => ({
            text: label,
            fillStyle: STATUS_COLORS[label as TaskStatusCategory]?.background || '#000',
            strokeStyle: STATUS_COLORS[label as TaskStatusCategory]?.border || '#000',
            hidden: excludedStatuses.includes(label),
            lineWidth: 1,
            pointStyle: 'circle',
            textAlign: 'left'
          })),
        },
        onClick: handleLegendClick,
      },
      title: { display: true, text: title, font: { size: 16, weight: '700' }, padding: { top: 10, bottom: 10 } },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.label || '';
            if (label) { label += ': '; }
            if (context.parsed !== null) {
              // CORE FIX: Percentage is now calculated against the stable grand total from the ref
              const percentage = grandTotalRef.current > 0 ? (context.parsed / grandTotalRef.current * 100).toFixed(2) + '%' : '0.00%';
              label += `${context.formattedValue} (${percentage})`;
            }
            return label;
          }
        }
      },
    },
    layout: {
      padding: { bottom: 5 }
    }
  };

  return (
    <div className="relative h-[450px]">
      <Pie data={chartData} options={options} />
      {displayedTotal > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+20px)] text-center pointer-events-none">
          {/* CORE FIX: The displayed number now comes from the state that reflects filtering */}
          <div className="text-4xl font-bold text-gray-800">{displayedTotal.toLocaleString()}</div>
          <div className="text-sm font-medium text-gray-600">เอกสาร</div>
        </div>
      )}
    </div>
  );
}
