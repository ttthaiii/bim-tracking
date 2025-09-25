import { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
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

export default function ProjectStatusChart() {
  const [chartData, setChartData] = useState({
    labels: ['อนุมัติ', 'CM', 'BIM', 'SITE'],
    datasets: [{
      data: [342, 163, 157, 70], // จำนวนเอกสารแต่ละประเภท
      backgroundColor: [
        'rgba(200, 200, 200, 0.8)', // สีเทา สำหรับ อนุมัติ
        'rgba(255, 99, 132, 0.8)',  // สีแดง สำหรับ CM
        'rgba(255, 159, 64, 0.8)',  // สีส้ม สำหรับ BIM
        'rgba(255, 205, 86, 0.8)',  // สีเหลือง สำหรับ SITE
      ],
      borderColor: [
        'rgba(200, 200, 200, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(255, 159, 64, 1)',
        'rgba(255, 205, 86, 1)',
      ],
      borderWidth: 1,
    }]
  });

  const [totalDocuments, setTotalDocuments] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tasksRef = collection(db, 'tasks');
        const snapshot = await getDocs(tasksRef);
        
        let approved = 0;
        let cm = 0;
        let bim = 0;
        let site = 0;
        let uniqueDocs = new Set(); // เก็บชื่อเอกสารที่ไม่ซ้ำ

        snapshot.forEach((doc) => {
          const task = doc.data();
          
          // เพิ่มเอกสารที่ไม่ซ้ำ
          if (task.documentNumber) {
            uniqueDocs.add(task.documentNumber);
          }

          // นับตามประเภท
          if (task.progress === 1) {
            approved++;
          }
          
          if (task.taskCategory?.includes('CM')) {
            cm++;
          } else if (task.taskCategory?.includes('BIM')) {
            bim++;
          } else if (task.taskCategory?.includes('SITE')) {
            site++;
          }
        });

        setTotalDocuments(uniqueDocs.size);
        setChartData(prev => ({
          ...prev,
          datasets: [{
            ...prev.datasets[0],
            data: [approved, cm, bim, site]
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
    cutout: '65%', // ทำให้เป็นโดนัท
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
        text: 'สัดส่วนแสดงสถานะแบบก่อสร้าง',
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    }
  };

  return (
    <div className="h-[300px] relative">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-3xl font-bold">
            {totalDocuments}
          </div>
          <div className="text-sm text-gray-500">
            จำนวนเอกสารรวม
          </div>
        </div>
      </div>
      <Pie 
        data={chartData} 
        options={{
          ...options,
          plugins: {
            ...options.plugins,
            title: {
              ...options.plugins.title,
              font: {
                size: 16,
                weight: 'bold' as const
              }
            }
          }
        }} 
      />
    </div>
  );
}