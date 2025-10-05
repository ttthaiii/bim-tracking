import React, { useState, useEffect } from 'react';
import { TaskAssignment } from '@/services/taskAssignService';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface RecheckPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  taskAssignments: TaskAssignment[];
  workDate: string;
  onEdit?: () => void;
}

export const RecheckPopup: React.FC<RecheckPopupProps> = ({
  isOpen,
  onClose,
  onConfirm,
  taskAssignments,
  workDate,
  onEdit
}) => {
  // แปลง workDate string เป็น Date object
  // แปลงวันที่จาก input type="date" (YYYY-MM-DD) เป็น Date object
  const initialDate = workDate ? new Date(workDate.replace(/-/g, '/')) : new Date();
  const [selectedDate, setSelectedDate] = useState<Value>(initialDate);

  // อัพเดท selectedDate เมื่อ workDate เปลี่ยน
  useEffect(() => {
    if (workDate) {
      setSelectedDate(new Date(workDate.replace(/-/g, '/')));
    }
  }, [workDate]);

  if (!isOpen) return null;

  // คำนวณชั่วโมงรวม
  const calculateTotalHours = () => {
    return taskAssignments.reduce((total, task) => {
      let sum = 0;
      if (task.workingHours && task.workingHours !== '-') {
        const [hours, minutes] = task.workingHours.split(':').map(Number);
        sum += hours + (minutes / 60);
      }
      if (task.overtimeHours && task.overtimeHours !== '-') {
        const [hours, minutes] = task.overtimeHours.split(':').map(Number);
        sum += hours + (minutes / 60);
      }
      return total + sum;
    }, 0);
  };

  const totalHours = calculateTotalHours();

  return (
    <>
      <style jsx global>{`
        .custom-calendar {
          font-family: 'Inter', sans-serif;
          background: white;
          border: none;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .custom-calendar .react-calendar__navigation {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          border-radius: 12px 12px 0 0;
          margin-bottom: 0;
          padding: 12px;
          border: none;
        }
        .custom-calendar .react-calendar__navigation button {
          color: white;
          font-weight: 600;
          border: none;
          background: none;
          padding: 6px 10px;
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        .custom-calendar .react-calendar__navigation button:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }
        .custom-calendar .react-calendar__month-view__weekdays {
          background: #f8f9fa;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .custom-calendar .react-calendar__month-view__weekdays__weekday {
          color: #6b7280;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .custom-calendar .react-calendar__tile {
          border: none;
          background: white;
          transition: all 0.2s ease;
          font-weight: 500;
          color: #374151;
          height: 40px;
          width: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 1px;
          border-radius: 6px;
          font-size: 13px;
          min-height: 40px;
          text-align: center;
        }
        .custom-calendar .react-calendar__month-view__days {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
          padding: 6px;
        }
        .custom-calendar .react-calendar__tile:hover {
          background: #fef3e2;
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);
        }
        .custom-calendar .react-calendar__tile--active {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%) !important;
          color: white !important;
          box-shadow: 0 4px 16px rgba(249, 115, 22, 0.4);
          font-weight: 600;
        }
        .custom-calendar .react-calendar__tile--now {
          background: #f97316 !important;
          color: white !important;
          font-weight: 600;
        }
        .custom-calendar .react-calendar__month-view__days__day--neighboringMonth {
          color: #d1d5db;
        }
      `}</style>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 flex gap-8 shadow-2xl border border-orange-100" style={{ minWidth: '80vw', maxHeight: '90vh' }}>
        {/* Left side - Calendar */}
        <div className="w-96">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 shadow-lg">
          <Calendar
            onChange={(value: Value) => setSelectedDate(value)}
            value={selectedDate}
            className="w-full border-0 rounded-xl shadow-md bg-white text-lg custom-calendar"
          />
          </div>
          <div className="mt-6 text-center bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-200">
            <p className="font-semibold text-lg mb-2 text-orange-800">วันที่เลือก:</p>
            <p className="text-lg text-orange-700">{selectedDate instanceof Date ? selectedDate.toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }) : ''}</p>
          </div>
        </div>

        {/* Right side - Table */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <h2 className="text-2xl font-semibold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-800">Drawing List</h2>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full border-collapse rounded-xl overflow-hidden shadow-lg">
              <thead>
                <tr className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg">
                  <th className="border border-orange-300 p-4 w-16 text-lg font-semibold first:rounded-tl-xl">No</th>
                  <th className="border border-orange-300 p-4 w-1/3 text-lg font-semibold">Relate Drawing</th>
                  <th className="border border-orange-300 p-4 w-40 text-lg font-semibold">เวลาทำงานปกติ</th>
                  <th className="border border-orange-300 p-4 w-40 text-lg font-semibold">เวลาโอที</th>
                  <th className="border border-orange-300 p-4 w-48 text-lg font-semibold">Progress</th>
                  <th className="border border-orange-300 p-4 text-lg font-semibold last:rounded-tr-xl">Note</th>
                </tr>
              </thead>
              <tbody>
                {taskAssignments.map((task, index) => (
                  <tr key={task.id} className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 transition-all duration-200">
                    <td className="border border-orange-200 p-4 text-center text-lg">{index + 1}</td>
                    <td className="border border-orange-200 p-4 text-lg">{task.relateDrawing}</td>
                    <td className="border border-orange-200 p-4 text-center text-lg">
                      {task.workingHours || '-'}
                    </td>
                    <td className="border border-orange-200 p-4 text-center text-lg">
                      {task.overtimeHours || '-'}
                    </td>
                    <td className="border border-orange-200 p-4">
                      <div className={`text-center rounded-full py-2 px-3 text-lg font-medium shadow-sm ${
                        parseInt(task.progress) === 100 
                          ? 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border border-emerald-300' 
                          : parseInt(task.progress) > 0 
                          ? 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border border-amber-300'
                          : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                      }`}>
                        {task.progress}
                      </div>
                    </td>
                    <td className="border border-orange-200 p-4 text-lg">{task.note || '-'}</td>
                  </tr>
                ))}
                <tr className="bg-gradient-to-r from-orange-100 to-amber-100 font-semibold border-t-2 border-orange-300">
                  <td colSpan={2} className="border border-orange-200 p-4 text-right text-lg text-orange-800">รวมชั่วโมงทั้งหมด:</td>
                  <td className="border border-orange-200 p-4 text-center text-lg text-orange-800">
                    {taskAssignments.reduce((total, task) => {
                      if (task.workingHours && task.workingHours !== '-') {
                        const [hours, minutes] = task.workingHours.split(':').map(Number);
                        return total + hours + (minutes / 60);
                      }
                      return total;
                    }, 0).toFixed(2)} ชั่วโมง
                  </td>
                  <td className="border border-orange-200 p-4 text-center text-lg text-orange-800">
                    {taskAssignments.reduce((total, task) => {
                      if (task.overtimeHours && task.overtimeHours !== '-') {
                        const [hours, minutes] = task.overtimeHours.split(':').map(Number);
                        return total + hours + (minutes / 60);
                      }
                      return total;
                    }, 0).toFixed(2)} ชั่วโมง
                  </td>
                  <td colSpan={2} className="border border-orange-200 p-4"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end space-x-6 mt-8">
            <button
              onClick={() => {
                onClose();
                if (onEdit) onEdit();
              }}
              className="px-8 py-3 bg-white border-2 border-orange-300 rounded-xl hover:bg-orange-50 text-orange-700 text-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              แก้ไขข้อมูล
            </button>
            <button
              onClick={onConfirm}
              className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              ยืนยันข้อมูล
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};