import { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
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
  'กำลังดำเนินการ-BIM': { background: 'rgba(20, 184, 166, 0.8)', border: 'rgba(20, 184, 166, 1)' },
  'วางแผนแล้ว-BIM': { background: 'rgba(59, 130, 246, 0.8)', border: 'rgba(59, 130, 246, 1)' },
  'ยังไม่วางแผน-BIM': { background: 'rgba(139, 92, 246, 0.8)', border: 'rgba(139, 92, 246, 1)' },
};

const STATUS_LABELS = Object.keys(STATUS_COLORS) as TaskStatusCategory[];

export default function ProjectStatusChart() {
  const { selectedProject, selectedStatus, setSelectedStatus } = useDashboard();
  const [chartData, setChartData] = useState<any>({
    labels: STATUS_LABELS,
    datasets: [{
      label: 'จำนวนเอกสาร',
      data: [],
      backgroundColor: STATUS_LABELS.map(label => STATUS_COLORS[label].background),
      borderColor: STATUS_LABELS.map(label => STATUS_COLORS[label].border),
      borderWidth: 1,
    }]
  });
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [title, setTitle] = useState('สถานะเอกสาร (ทั้งหมด)');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksSnapshot, projectsSnapshot] = await Promise.all([
          getDocs(collection(db, 'tasks')),
          getDocs(collection(db, 'projects')),
        ]);

        const projectsMap = new Map<string, string>();
        projectsSnapshot.forEach(doc => projectsMap.set(doc.id, doc.data().name));

        const statusMap = Object.fromEntries(STATUS_LABELS.map(label => [label, 0])) as Record<TaskStatusCategory, number>;

        tasksSnapshot.forEach((doc) => {
          const task = doc.data() as Task;
          const projectName = projectsMap.get(task.projectId) || task.projectId;

          if (selectedProject && projectName !== selectedProject) {
            return;
          }

          const status = getTaskStatusCategory(task);
          if (status in statusMap) {
            statusMap[status]++;
          }
        });

        const data = STATUS_LABELS.map(label => statusMap[label]);
        const total = data.reduce((a, b) => a + b, 0);

        setChartData((prev: any) => ({ ...prev, datasets: [{ ...prev.datasets[0], data }] }));
        setTotalDocuments(total);
        setTitle(`สถานะเอกสาร (${selectedProject || 'ทั้งหมด'})`);

      } catch (error) {
        console.error('Error fetching project status data:', error);
      }
    };

    fetchData();
  }, [selectedProject]);

  const handleChartClick = (event: any, elements: any[]) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const status = chartData.labels[index];
      setSelectedStatus((prev: string | null) => (status === prev ? null : status));
    }
  };

  useEffect(() => {
    const getBackgroundColors = () => {
        return STATUS_LABELS.map(label => {
            const color = STATUS_COLORS[label].background;
            if (!selectedStatus) return color;
            return label === selectedStatus ? color.replace('0.8', '1') : color.replace('0.8', '0.3');
        });
    };

    setChartData((prev: any) => ({ ...prev, datasets: [{ ...prev.datasets[0], backgroundColor: getBackgroundColors() }] }));
  }, [selectedStatus]);


  const options = {
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
          pointStyle: 'circle' 
        } 
      },
      title: { display: true, text: title, font: { size: 16, weight: '700' }, padding: { top: 10, bottom: 10 } }, // Reset padding to center chart
      tooltip: { /* ... tooltip config ... */ },
    },
    layout: {
      padding: {
        bottom: 5
      }
    }
  };

  return (
    <div className="relative h-[450px]">
      <Pie data={chartData} options={options} />
      {totalDocuments > 0 && (
        // Removed translate-y to center the total count
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-800">{totalDocuments.toLocaleString()}</div>
            <div className="text-sm font-medium text-gray-600">เอกสาร</div>
          </div>
        </div>
      )}
    </div>
  );
}
