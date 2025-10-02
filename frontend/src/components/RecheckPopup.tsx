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
      if (task.timeType === 'leave' && task.leaveData?.leaveHours) {
        const [hours, minutes] = task.leaveData.leaveHours.split(':').map(Number);
        return total + hours + (minutes / 60);
      } else if (task.workingHours && task.workingHours !== '-') {
        const [hours, minutes] = task.workingHours.split(':').map(Number);
        return total + hours + (minutes / 60);
      }
      return total;
    }, 0);
  };

  const totalHours = calculateTotalHours();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 flex gap-4" style={{ maxWidth: '90vw', maxHeight: '90vh' }}>
        {/* Left side - Calendar */}
        <div className="w-80">
          <Calendar
            onChange={(value: Value) => setSelectedDate(value)}
            value={selectedDate}
            className="w-full border rounded-lg shadow-lg bg-white"
          />
          <div className="mt-4 text-center">
            <p className="font-semibold">วันที่เลือก:</p>
            <p>{selectedDate instanceof Date ? selectedDate.toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }) : ''}</p>
          </div>
        </div>

        {/* Right side - Table */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Drawing List</h2>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border p-2 w-12">No</th>
                  <th className="border p-2 w-1/4">Relate Drawing</th>
                  <th className="border p-2 w-32">Time</th>
                  <th className="border p-2 w-32">Working hours</th>
                  <th className="border p-2 w-40">Progress</th>
                  <th className="border p-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {taskAssignments.map((task, index) => (
                  <tr key={task.id}>
                    <td className="border p-2 text-center">{index + 1}</td>
                    <td className="border p-2">{task.relateDrawing}</td>
                    <td className="border p-2">
                      {task.timeType === 'normal' ? 'เวลาปกติ' :
                       task.timeType === 'ot' ? 'เวลาโอที' :
                       task.timeType === 'leave' ? 'ลา' : ''}
                    </td>
                    <td className="border p-2 text-center">
                      {task.timeType === 'leave' && task.leaveData
                        ? task.leaveData.leaveHours
                        : task.workingHours || '-'}
                    </td>
                    <td className="border p-2">
                      <div className={`text-center rounded-full py-1 px-2 ${
                        parseInt(task.progress) === 100 
                          ? 'bg-green-100 text-green-800' 
                          : parseInt(task.progress) > 0 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {task.progress}
                      </div>
                    </td>
                    <td className="border p-2">{task.note || '-'}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={3} className="border p-2 text-right">รวมชั่วโมงทำงาน:</td>
                  <td className="border p-2 text-center">{totalHours.toFixed(2)} ชั่วโมง</td>
                  <td colSpan={2} className="border p-2"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end space-x-4 mt-6">
                          <button
                onClick={() => {
                  onClose();
                  if (onEdit) onEdit();
                }}
                className="px-6 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
              >
                Edit
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Close
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};