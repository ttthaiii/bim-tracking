import { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getTaskStatusCategory } from '@/services/dashboardService';
import { useDashboard } from '@/context/DashboardContext';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface ProjectStatusChartProps {
  projectId?: string;
}

export default function ProjectStatusChart({ projectId }: ProjectStatusChartProps) {
  const { selectedStatus, setSelectedStatus } = useDashboard();

  const [chartData, setChartData] = useState<{
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
      borderWidth: number;
    }>;
  }>({
    labels: ['เสร็จสิ้น', 'รออนุมัติจาก CM', 'รอตรวจสอบหน้างาน', 'รอแก้ไขแบบ BIM', 'กำลังดำเนินการ-BIM', 'วางแผนแล้ว-BIM', 'ยังไม่วางแผน-BIM'],
    datasets: [{
      label: 'จำนวนเอกสาร',
      data: [],
      backgroundColor: [
        'rgba(0, 200, 83, 0.8)',    // เสร็จสิ้น - เขียว
        'rgba(255, 99, 132, 0.8)',   // CM - แดง
        'rgba(255, 205, 86, 0.8)',   // SITE - เหลือง
        'rgba(255, 159, 64, 0.8)',   // BIM - ส้ม
        'rgba(75, 192, 192, 0.8)',   // กำลังดำเนินการ-BIM - เขียวอมฟ้า
        'rgba(54, 162, 235, 0.8)',   // วางแผนแล้ว-BIM - น้ำเงิน
        'rgba(153, 102, 255, 0.8)',  // ยังไม่วางแผน-BIM - ม่วง
      ],
      borderColor: [
        'rgba(0, 200, 83, 1)',
        'rgba(255, 99, 132, 1)', 
        'rgba(255, 205, 86, 1)',
        'rgba(255, 159, 64, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(153, 102, 255, 1)',
      ],
      borderWidth: 1,
    }]
  });

  const [totalDocuments, setTotalDocuments] = useState(0);

  const handleChartClick = (event: any, elements: any[]) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const status = chartData.labels[index];
      setSelectedStatus(status === selectedStatus ? null : status);
    }
  };

  const options = {
    onClick: handleChartClick,
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    radius: '90%',
    plugins: {
      legend: {
        position: 'right' as const,
        onClick: (e: any, legendItem: any, legend: any) => {
          const status = chartData.labels[legendItem.index];
          setSelectedStatus(status === selectedStatus ? null : status);
        },
        labels: {
          generateLabels: (chart: any) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, i: number) => ({
                text: label,
                fillStyle: selectedStatus === label 
                  ? data.datasets[0].backgroundColor[i].replace('0.8', '1')
                  : selectedStatus
                    ? data.datasets[0].backgroundColor[i].replace('0.8', '0.3')
                    : data.datasets[0].backgroundColor[i],
                hidden: false,
                lineCap: 'round',
                lineDash: [],
                lineDashOffset: 0,
                lineJoin: 'round',
                lineWidth: 1,
                strokeStyle: data.datasets[0].borderColor[i],
                pointStyle: 'circle',
                rotation: 0
              }));
            }
            return [];
          },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      title: {
        display: true,
        text: 'สถานะเอกสาร',
        font: {
          size: 16,
          weight: 700
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = chartData.labels[context.dataIndex];
            const value = chartData.datasets[0].data[context.dataIndex];
            const percentage = ((value / totalDocuments) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        },
        padding: 12,
        boxPadding: 6
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("เริ่มดึงข้อมูล tasks...");
        const tasksRef = collection(db, 'tasks');
        const snapshot = await getDocs(tasksRef);
        console.log(`จำนวน tasks ทั้งหมด: ${snapshot.size}`);
        
        const statusMap = {
          'เสร็จสิ้น': 0,
          'รออนุมัติจาก CM': 0,
          'รอตรวจสอบหน้างาน': 0,
          'รอแก้ไขแบบ BIM': 0,
          'กำลังดำเนินการ-BIM': 0,
          'วางแผนแล้ว-BIM': 0,
          'ยังไม่วางแผน-BIM': 0
        };
        
        snapshot.forEach((doc) => {
          const task = doc.data();
          const taskStatus = {
            currentStep: task.currentStep,
            subtaskCount: task.subtasks?.length || 0,
            totalMH: task.totalMH || 0
          };
          const status = getTaskStatusCategory(taskStatus);
          statusMap[status]++;
        });
        
        const data = [
          statusMap['เสร็จสิ้น'],
          statusMap['รออนุมัติจาก CM'],
          statusMap['รอตรวจสอบหน้างาน'],
          statusMap['รอแก้ไขแบบ BIM'],
          statusMap['กำลังดำเนินการ-BIM'],
          statusMap['วางแผนแล้ว-BIM'],
          statusMap['ยังไม่วางแผน-BIM']
        ];
        
        setChartData(prev => ({
          ...prev,
          datasets: [{
            ...prev.datasets[0],
            data
          }]
        }));
        
        const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
        setTotalDocuments(total);
      } catch (error) {
        console.error('Error fetching task data:', error);
      }
    };

    fetchData();
  }, [projectId]);

  // Compute current background colors based on selected status
  const getBackgroundColors = () => {
    const defaultColors = [
      'rgba(0, 200, 83, 0.8)',    // เสร็จสิ้น - เขียว
      'rgba(255, 99, 132, 0.8)',   // CM - แดง
      'rgba(255, 205, 86, 0.8)',   // SITE - เหลือง
      'rgba(255, 159, 64, 0.8)',   // BIM - ส้ม
      'rgba(75, 192, 192, 0.8)',   // กำลังดำเนินการ-BIM - เขียวอมฟ้า
      'rgba(54, 162, 235, 0.8)',   // วางแผนแล้ว-BIM - น้ำเงิน
      'rgba(153, 102, 255, 0.8)',  // ยังไม่วางแผน-BIM - ม่วง
    ];

    if (!selectedStatus) {
      return defaultColors;
    }

    return defaultColors.map((color, index) => {
      if (chartData.labels[index] === selectedStatus) {
        return color.replace('0.8', '1');
      }
      return color.replace('0.8', '0.3');
    });
  };

  useEffect(() => {
    setChartData(prev => ({
      ...prev,
      datasets: [{
        ...prev.datasets[0],
        backgroundColor: getBackgroundColors()
      }]
    }));
  }, [selectedStatus]);

  return (
    <>
      <div className="relative h-[400px]">
        <Pie data={chartData} options={options} />
        {totalDocuments > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center bg-white bg-opacity-80 rounded-full p-4">
              <div className="text-4xl font-bold text-gray-800">{totalDocuments.toLocaleString()}</div>
              <div className="text-sm font-medium text-gray-600">Total Documents</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}