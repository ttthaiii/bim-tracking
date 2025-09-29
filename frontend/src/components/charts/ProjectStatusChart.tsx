import { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getTaskStatusCategory } from '@/services/dashboardService';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  Title
);

interface ProjectStatusChartProps {
  projectId?: string;
}

export default function ProjectStatusChart({ projectId }: ProjectStatusChartProps) {
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("เริ่มดึงข้อมูล tasks...");
        const tasksRef = collection(db, 'tasks');
        const snapshot = await getDocs(tasksRef);
        console.log(`จำนวน tasks ทั้งหมด: ${snapshot.size}`);
        
        // Initialize status counts
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
          console.log("ข้อมูล task:", {
            id: doc.id,
            taskName: task.taskName,
            currentStep: task.currentStep,
            subtaskCount: task.subtaskCount,
            totalMH: task.totalMH
          });
          const status = getTaskStatusCategory(task);
          console.log("แปลงสถานะเป็น:", status);
          statusMap[status]++;
        });        console.log("สถานะทั้งหมด:", statusMap);
        
        const data = [
          statusMap['รออนุมัติจาก CM'],
          statusMap['รอตรวจสอบหน้างาน'],
          statusMap['รอแก้ไขแบบ BIM'],
          statusMap['กำลังดำเนินการ-BIM'],
          statusMap['วางแผนแล้ว-BIM'],
          statusMap['ยังไม่วางแผน-BIM']
        ];
        
        console.log("ข้อมูลที่จะแสดงในกราฟ:", data);
        
        const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
        console.log("จำนวนเอกสารทั้งหมด:", total);
        
        setTotalDocuments(total);
        setChartData(prev => ({
          ...prev,
          datasets: [{
            ...prev.datasets[0],
            data
          }]
        }));
      } catch (error) {
        console.error("Error fetching project status data:", error);
      }
    };

    fetchData();
  }, []);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%', // donut style
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      title: {
        display: true,
        text: 'จำนวนเอกสารแยกตามสถานะ',
        font: {
          size: 16,
          weight: 'bold' as const
        }
      }
    }
  };

  return (
    <div className="h-[350px] relative">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-3xl font-bold">{totalDocuments}</div>
          <div className="text-sm text-gray-500">จำนวนเอกสารรวม</div>
        </div>
      </div>
      <Pie 
        data={chartData} 
        options={options}
      />
    </div>
  );
}