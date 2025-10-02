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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 flex gap-8" style={{ minWidth: '80vw', maxHeight: '90vh' }}>
        {/* Left side - Calendar */}
        <div className="w-96">
          <Calendar
            onChange={(value: Value) => setSelectedDate(value)}
            value={selectedDate}
            className="w-full border rounded-lg shadow-lg bg-white text-lg"
          />
          <div className="mt-6 text-center">
            <p className="font-semibold text-lg mb-2">วันที่เลือก:</p>
            <p className="text-lg">{selectedDate instanceof Date ? selectedDate.toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }) : ''}</p>
          </div>
        </div>

        {/* Right side - Table */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <h2 className="text-2xl font-semibold mb-6">Drawing List</h2>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 w-16 text-lg font-semibold">No</th>
                  <th className="border p-3 w-1/3 text-lg font-semibold">Relate Drawing</th>
                  <th className="border p-3 w-40 text-lg font-semibold">เวลาทำงานปกติ</th>
                  <th className="border p-3 w-40 text-lg font-semibold">เวลาโอที</th>
                  <th className="border p-3 w-48 text-lg font-semibold">Progress</th>
                  <th className="border p-3 text-lg font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {taskAssignments.map((task, index) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="border p-3 text-center text-lg">{index + 1}</td>
                    <td className="border p-3 text-lg">{task.relateDrawing}</td>
                    <td className="border p-3 text-center text-lg">
                      {task.workingHours || '-'}
                    </td>
                    <td className="border p-3 text-center text-lg">
                      {task.overtimeHours || '-'}
                    </td>
                    <td className="border p-3">
                      <div className={`text-center rounded-full py-2 px-3 text-lg ${
                        parseInt(task.progress) === 100 
                          ? 'bg-green-100 text-green-800' 
                          : parseInt(task.progress) > 0 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {task.progress}
                      </div>
                    </td>
                    <td className="border p-3 text-lg">{task.note || '-'}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold">
                  <td colSpan={2} className="border p-3 text-right text-lg">รวมชั่วโมงทั้งหมด:</td>
                  <td className="border p-3 text-center text-lg">
                    {taskAssignments.reduce((total, task) => {
                      if (task.workingHours && task.workingHours !== '-') {
                        const [hours, minutes] = task.workingHours.split(':').map(Number);
                        return total + hours + (minutes / 60);
                      }
                      return total;
                    }, 0).toFixed(2)} ชั่วโมง
                  </td>
                  <td className="border p-3 text-center text-lg">
                    {taskAssignments.reduce((total, task) => {
                      if (task.overtimeHours && task.overtimeHours !== '-') {
                        const [hours, minutes] = task.overtimeHours.split(':').map(Number);
                        return total + hours + (minutes / 60);
                      }
                      return total;
                    }, 0).toFixed(2)} ชั่วโมง
                  </td>
                  <td colSpan={2} className="border p-3"></td>
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
                  className="px-8 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-lg font-medium"
                >
                  แก้ไขข้อมูล
                </button>
                <button
                  onClick={onConfirm}
                  className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 text-lg font-medium"
                >
                  ยืนยันข้อมูล
                </button>
          </div>
        </div>
      </div>
    </div>
  );
};