'use client';

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { getEmployeeByID } from '@/services/employeeService';
import { getEmployeeTaskAssignments, TaskAssignment, getRelateDrawingOptions } from '@/services/taskAssignService';
import { RecheckPopup } from '@/components/RecheckPopup';
import { LeavePopup } from '@/components/LeavePopup';
import { TimeSelector } from '@/components/TimeSelector';
import { ConfirmationPopup } from '@/components/ConfirmationPopup';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export default function DailyReport() {
  const [date, setDate] = useState<Value>(new Date());
  const [employeeId, setEmployeeId] = useState('');
  const [employeeData, setEmployeeData] = useState<{ employeeId: string; fullName: string } | null>(null);
  const [availableSubtasks, setAvailableSubtasks] = useState<{ value: string; label: string; }[]>([]);
  const [workDate, setWorkDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);

  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);

  // Fix hydration error by ensuring Calendar only renders on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleEmployeeSearch = async () => {
    if (!employeeId) return;
    
    setLoading(true);
    setError('');
    setTaskAssignments([]);
    
    try {
      const [employee, assignments] = await Promise.all([
        getEmployeeByID(employeeId),
        getEmployeeTaskAssignments(employeeId)
      ]);
      
      if (employee) {
        setEmployeeData(employee);
        setTaskAssignments(assignments);
        
        // ดึงข้อมูล Relate Drawing options (รวม leave options แล้ว)
        const drawingOptions = await getRelateDrawingOptions(employee.fullName);
        
        setAvailableSubtasks(drawingOptions);
      } else {
        setError('ไม่พบข้อมูลพนักงาน');
        setEmployeeData(null);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการค้นหาข้อมูล');
      setEmployeeData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = (taskId: string, updates: Partial<TaskAssignment>) => {
    setTaskAssignments(tasks => 
      tasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      )
    );
    setHasUnsavedChanges(true);
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
      setTaskAssignments(tasks => tasks.filter(task => task.id !== taskId));
    }
  };

  const [isRecheckOpen, setIsRecheckOpen] = useState(false);
  const [showLeavePopup, setShowLeavePopup] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRecheckOpen(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      // Save data to localStorage (simulate database save)
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const savedData = JSON.parse(localStorage.getItem('dailyReportData') || '{}');
          savedData[workDate] = {
            employeeId,
            employeeData,
            taskAssignments: taskAssignments.filter(task => task.assignDate === workDate),
            savedAt: new Date().toISOString()
          };
          localStorage.setItem('dailyReportData', JSON.stringify(savedData));
        } catch (error) {
          console.error('Error saving to localStorage:', error);
          alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
          return;
        }
      }
      
      console.log('Data saved:', { employeeId, employeeData, workDate, taskAssignments });
      setIsRecheckOpen(false);
      setHasUnsavedChanges(false);
      
      // Force calendar re-render to show new colors
      setDate(new Date(date as Date));
      
      // Show success message
      alert('บันทึกข้อมูลเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error submitting data:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
      <style jsx global>{`
        .custom-calendar {
          font-family: 'Inter', sans-serif;
          background: white;
          border: none;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 350px;
        }
        .custom-calendar .react-calendar__navigation {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          border-radius: 16px 16px 0 0;
          margin-bottom: 0;
          padding: 16px;
          border: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .custom-calendar .react-calendar__navigation__label {
          font-size: 18px;
          font-weight: 700;
          color: white;
          flex-grow: 1;
          text-align: left !important;
          padding-left: 0;
          margin: 0;
          background: none;
          border: none;
          cursor: pointer;
        }
        .custom-calendar .react-calendar__navigation__arrow {
          color: white;
          font-weight: 600;
          font-size: 16px;
          border: none;
          background: none;
          padding: 8px 12px;
          border-radius: 8px;
          transition: all 0.2s ease;
          min-width: 40px;
        }
        .custom-calendar .react-calendar__navigation button:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }
        .custom-calendar .react-calendar__month-view__weekdays {
          background: #f8f9fa;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .custom-calendar .react-calendar__month-view__weekdays__weekday {
          color: #6b7280;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: center;
          padding: 8px 4px;
        }
        .custom-calendar .react-calendar__tile {
          border: none;
          background: white;
          transition: all 0.2s ease;
          font-weight: 500;
          color: #374151;
          height: 42px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-size: 13px;
          text-align: center;
          aspect-ratio: 1;
        }
        .custom-calendar .react-calendar__month-view__days {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr);
          gap: 3px;
          padding: 12px;
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
      <div className="container-fluid mx-auto p-6">
        <div className="flex gap-6">
        {/* Left side - Calendar */}
        <div className="w-80">
          <div className="bg-white rounded-2xl shadow-xl p-6 backdrop-blur-sm">
          {isClient && (
          <Calendar
            onChange={async (value: Value) => {
              if (value instanceof Date) {
                if (hasUnsavedChanges) {
                  setPendingDate(value);
                  setShowConfirmation(true);
                  return;
                }
                
                // ใช้ padStart เพื่อให้แน่ใจว่าเลขวันและเดือนมี 2 หลักเสมอ
                const year = value.getFullYear();
                const month = String(value.getMonth() + 1).padStart(2, '0');
                const day = String(value.getDate()).padStart(2, '0');
                const selectedDate = `${year}-${month}-${day}`;
                
                setDate(value);
                setWorkDate(selectedDate);

                // Load existing data for the selected date
                let dateData = null;
                if (typeof window !== 'undefined' && window.localStorage) {
                  try {
                    const savedData = JSON.parse(localStorage.getItem('dailyReportData') || '{}');
                    dateData = savedData[selectedDate];
                  } catch (error) {
                    console.error('Error reading localStorage:', error);
                  }
                }

                if (dateData) {
                  // ถ้ามีข้อมูลอยู่แล้ว ให้โหลดข้อมูลนั้น
                  setEmployeeId(dateData.employeeId || '');
                  setEmployeeData(dateData.employeeData || null);
                  setTaskAssignments(dateData.taskAssignments || []);
                  
                  // โหลด dropdown options ถ้ามี employee data
                  if (dateData.employeeData) {
                    const drawingOptions = await getRelateDrawingOptions(dateData.employeeData.fullName);
                    setAvailableSubtasks(drawingOptions);
                  }
                  
                  // แสดง RecheckPopup เพื่อดูข้อมูล
                  setIsRecheckOpen(true);
                } else if (employeeId) {
                  // ถ้าไม่มีข้อมูลแต่มีรหัสพนักงานแล้ว ให้เตรียมสำหรับการลงข้อมูลใหม่
                  setTaskAssignments([]);
                }
              }
            }}
            value={date}
            className="w-full border-0 rounded-2xl shadow-lg bg-white custom-calendar"
            locale="th-TH"
            formatShortWeekday={(locale, date) => ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][date.getDay()]}
            navigationLabel={({ date, view }) => {
              if (view === 'month') {
                const thaiMonths = [
                  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
                ];
                return `${thaiMonths[date.getMonth()]} ${date.getFullYear()}`;
              }
              return '';
            }}
            tileClassName={({ date: tileDate, view }) => {
              if (view !== 'month') return '';

              // แปลง tileDate เป็น Date object และตั้งเวลาเป็น 00:00:00
              const tileDateOnly = new Date(tileDate);
              tileDateOnly.setHours(0, 0, 0, 0);

              // วันที่ปัจจุบัน
              const today = new Date();
              today.setHours(0, 0, 0, 0);

              // คำนวณวันที่สามารถแก้ไขย้อนหลังได้ (2 วัน)
              const twoDaysAgo = new Date(today);
              twoDaysAgo.setDate(today.getDate() - 2);

              // เช็คว่าเป็นวันที่มีการบันทึกข้อมูลหรือไม่
              let hasData = false;
              if (typeof window !== 'undefined' && window.localStorage) {
                try {
                  const savedData = JSON.parse(localStorage.getItem('dailyReportData') || '{}');
                  const tileDateString = `${tileDateOnly.getFullYear()}-${String(tileDateOnly.getMonth() + 1).padStart(2, '0')}-${String(tileDateOnly.getDate()).padStart(2, '0')}`;
                  hasData = savedData[tileDateString] && savedData[tileDateString].taskAssignments && savedData[tileDateString].taskAssignments.length > 0;
                } catch (error) {
                  console.error('Error reading localStorage:', error);
                  hasData = false;
                }
              }

              let classes = ['rounded-full'];

              // วันที่ปัจจุบัน (สีส้ม)
              if (tileDateOnly.getTime() === today.getTime()) {
                classes.push('bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-lg');
              }
              // วันที่มีข้อมูลแล้ว
              else if (hasData) {
                // ถ้าเป็นวันที่แก้ไขได้ (ใน 2 วัน) ให้ใช้สีส้มอ่อน
                if (tileDateOnly >= twoDaysAgo && tileDateOnly < today) {
                  classes.push('bg-gradient-to-r from-amber-200 to-amber-300 ring-2 ring-amber-400 shadow-md');
                } else {
                  // วันที่มีข้อมูลแล้ว (แก้ไขไม่ได้) - กรอบสีเทา
                  classes.push('bg-white border-2 border-gray-400 text-gray-700');
                }
              }
              // วันที่สามารถลงข้อมูลย้อนหลังได้ (2 วัน) - สีฟ้าเทา
              else if (tileDateOnly >= twoDaysAgo && tileDateOnly < today) {
                classes.push('bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-md');
              }
              
              return classes.join(' ');
            }}
          />
          )}
          </div>
          {/* คำอธิบายสี */}
          <div className="mt-6 space-y-3 text-sm bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-100">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 shadow-md"></div>
              <span className="text-gray-700 font-medium">วันที่ปัจจุบัน</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-amber-200 to-amber-300 ring-2 ring-amber-400 shadow-md"></div>
              <span className="text-gray-700 font-medium">วันที่มีการลงข้อมูลแล้ว (สามารถแก้ไขได้)</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 rounded-full bg-white border-2 border-gray-400 shadow-md"></div>
              <span className="text-gray-700 font-medium">วันที่มีการลงข้อมูลแล้ว</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-slate-400 to-slate-500 shadow-md"></div>
              <span className="text-gray-700 font-medium">วันที่สามารถลงข้อมูลย้อนหลังได้</span>
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl shadow-2xl p-8 backdrop-blur-sm border border-orange-100">
            <div className="flex justify-between mb-6">
              <div className="w-1/2 pr-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสพนักงาน</label>
                <div className="flex">
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full p-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-200 bg-gradient-to-r from-white to-orange-50"
                    placeholder="XXXXXX"
                  />
                  <button
                    type="button"
                    onClick={handleEmployeeSearch}
                    className="ml-3 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-medium"
                    disabled={loading}
                  >
                    {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
                  </button>
                </div>
                {error && <p className="mt-1 text-red-500 text-sm">{error}</p>}
                {employeeData && (
                  <p className="mt-2 text-black text-lg font-semibold">
                    ชื่อ-นามสกุล: {employeeData.fullName}
                  </p>
                )}
              </div>
              <div className="w-1/2 pl-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ทำงาน</label>
                <div className="relative">
                  <input
                    type="date"
                    value={workDate}
                    disabled
                    className="w-full p-3 border-2 border-orange-200 rounded-xl pr-12 bg-gradient-to-r from-gray-50 to-orange-50 cursor-not-allowed"
                  />
                  <span className="absolute right-2 top-2">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse rounded-xl overflow-hidden shadow-lg">
                <thead>
                  <tr className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg">
                    <th className="border border-orange-300 px-4 py-4 text-center w-12 font-semibold text-lg first:rounded-tl-xl">No</th>
                    <th className="border border-orange-300 p-4 text-center w-1/4 font-semibold text-lg">Relate Drawing</th>
                    <th className="border border-orange-300 p-4 text-center w-48 font-semibold text-lg">เวลาทำงาน / Working Hours</th>
                    <th className="border border-orange-300 p-4 text-center w-48 font-semibold text-lg">เวลาโอที / Overtime</th>
                    <th className="border border-orange-300 p-4 text-center w-40 font-semibold text-lg">Progress</th>
                    <th className="border border-orange-300 p-4 text-center w-1/4 font-semibold text-lg">Note</th>
                    <th className="border border-orange-300 p-4 text-center w-40 font-semibold text-lg">Upload File</th>
                    <th className="border border-orange-300 p-4 text-center w-16 font-semibold text-lg last:rounded-tr-xl">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {taskAssignments.map((assignment, index) => (
                    <tr key={assignment.id} className={`${
                      assignment.isLeaveRow ? 'bg-gray-50' :
                      assignment.status === 'completed' ? 'bg-green-50' :
                      assignment.status === 'in-progress' ? 'bg-yellow-50' : ''
                    }`}>
                      <td className="border border-orange-200 p-3">{assignment.isLeaveRow ? '-' : index + 1}</td>
                      <td className="border border-orange-200 p-3">
                        {assignment.isLeaveRow ? (
                          <div className="font-medium text-gray-700">{assignment.relateDrawing}</div>
                        ) : (
                          <select
                            value={assignment.relateDrawing}
                            onChange={(e) => handleUpdateTask(assignment.id, { relateDrawing: e.target.value })}
                            className="w-full border-2 border-orange-200 rounded-xl p-3 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-200 bg-gradient-to-r from-white to-orange-50"
                          >
                            <option value="">เลือกงาน</option>
                            {availableSubtasks.map((option, index) => (
                              <option key={index} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="border p-2">
                        <div className="flex justify-center gap-2">
                          <select
                            value={assignment.workingHours?.split(':')[0] || ''}
                            onChange={(e) => {
                              const minutes = assignment.workingHours?.split(':')[1] || '00';
                              handleUpdateTask(assignment.id, { 
                                workingHours: `${e.target.value}:${minutes}` 
                              });
                            }}
                            className="border-2 border-orange-200 rounded-xl p-2 text-center focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all duration-200 bg-gradient-to-r from-white to-orange-50"
                          >
                            <option value="">ชั่วโมง</option>
                            {Array.from({ length: 8 }, (_, i) => (
                              <option key={i + 1} value={i + 1}>
                                {i + 1} ชั่วโมง
                              </option>
                            ))}
                          </select>
                          <select
                            value={assignment.workingHours?.split(':')[1] || ''}
                            onChange={(e) => {
                              const hours = assignment.workingHours?.split(':')[0] || '0';
                              handleUpdateTask(assignment.id, { 
                                workingHours: `${hours}:${e.target.value}` 
                              });
                            }}
                            className="border-2 border-orange-200 rounded-xl p-2 text-center focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all duration-200 bg-gradient-to-r from-white to-orange-50"
                          >
                            <option value="">นาที</option>
                            {['15', '30', '45'].map((minute) => (
                              <option key={minute} value={minute}>
                                {minute} นาที
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="border p-2">
                        <div className="flex justify-center gap-2">
                          <select
                            value={assignment.overtimeHours?.split(':')[0] || ''}
                            onChange={(e) => {
                              const minutes = assignment.overtimeHours?.split(':')[1] || '00';
                              handleUpdateTask(assignment.id, { 
                                overtimeHours: `${e.target.value}:${minutes}` 
                              });
                            }}
                            className="border-2 border-orange-200 rounded-xl p-2 text-center focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all duration-200 bg-gradient-to-r from-white to-orange-50"
                          >
                            <option value="">ชั่วโมง</option>
                            {Array.from({ length: 8 }, (_, i) => (
                              <option key={i + 1} value={i + 1}>
                                {i + 1} ชั่วโมง
                              </option>
                            ))}
                          </select>
                          <select
                            value={assignment.overtimeHours?.split(':')[1] || ''}
                            onChange={(e) => {
                              const hours = assignment.overtimeHours?.split(':')[0] || '0';
                              handleUpdateTask(assignment.id, { 
                                overtimeHours: `${hours}:${e.target.value}` 
                              });
                            }}
                            className="border-2 border-orange-200 rounded-xl p-2 text-center focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all duration-200 bg-gradient-to-r from-white to-orange-50"
                          >
                            <option value="">นาที</option>
                            {['15', '30', '45'].map((minute) => (
                              <option key={minute} value={minute}>
                                {minute} นาที
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="border p-2">
                        <div className="flex space-x-2">
                          {!assignment.isLeaveRow ? (
                            <>
                              <select
                                value={assignment.status}
                                onChange={(e) => {
                                  const status = e.target.value as TaskAssignment['status'];
                                  handleUpdateTask(assignment.id, { status });
                                }}
                                className={`rounded-xl p-2 flex-1 border-2 transition-all duration-200 ${
                                  assignment.status === 'completed' ? 'bg-gradient-to-r from-green-100 to-green-200 border-green-300' :
                                  assignment.status === 'in-progress' ? 'bg-gradient-to-r from-amber-100 to-amber-200 border-amber-300' :
                                  'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300'
                                }`}
                              >
                                <option value="pending">รอดำเนินการ</option>
                                <option value="in-progress">กำลังดำเนินการ</option>
                                <option value="completed">เสร็จสมบูรณ์</option>
                              </select>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={parseInt(assignment.progress) || 0}
                                onChange={(e) => {
                                  const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                  handleUpdateTask(assignment.id, { 
                                    progress: `${value}%`,
                                    status: value === 100 ? 'completed' : 
                                            value === 0 ? 'pending' : 
                                            'in-progress'
                                  });
                                }}
                                className="w-20 rounded-xl p-2 border-2 border-orange-200 text-center focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all duration-200"
                                placeholder="0-100"
                              />
                              <span className="flex items-center">%</span>
                            </>
                          ) : (
                            <div className="w-full text-center text-gray-500">-</div>
                          )}
                        </div>
                      </td>
                      <td className="border p-2">
                        {assignment.isLeaveRow ? (
                          <input
                            type="text"
                            value={assignment.note || ''}
                            onChange={(e) => handleUpdateTask(assignment.id, { note: e.target.value })}
                            className="border-2 border-orange-200 rounded-xl p-2 w-full focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all duration-200 bg-gradient-to-r from-white to-orange-50"
                            placeholder={assignment.leaveType === 'other' ? 'โปรดระบุประเภทการลา' : 'เพิ่มหมายเหตุ'}
                          />
                        ) : (
                          <input
                            type="text"
                            value={assignment.note || ''}
                            onChange={(e) => handleUpdateTask(assignment.id, { note: e.target.value })}
                            className="border-2 border-orange-200 rounded-xl p-2 w-full focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all duration-200 bg-gradient-to-r from-white to-orange-50"
                            placeholder="เพิ่มหมายเหตุ"
                          />
                        )}
                      </td>
                      <td className="border p-2">
                        <div className="flex items-center justify-center">
                          {!assignment.isLeaveRow && (
                            <>
                              <input
                                type="file"
                                id={`file-${assignment.id}`}
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    console.log('Uploading file:', file);
                                    handleUpdateTask(assignment.id, { isUploading: true });
                                    setTimeout(() => {
                                      handleUpdateTask(assignment.id, { 
                                        isUploading: false,
                                        fileUrl: URL.createObjectURL(file),
                                        fileName: file.name
                                      });
                                    }, 1000);
                                  }
                                }}
                              />
                              {parseInt(assignment.progress) === 100 ? (
                                assignment.isUploading ? (
                                  <div className="flex items-center space-x-2 text-gray-500">
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>กำลังอัพโหลด...</span>
                                  </div>
                                ) : assignment.fileUrl ? (
                                  <div className="flex items-center space-x-2">
                                    <a 
                                      href={assignment.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline text-sm truncate max-w-[150px]"
                                    >
                                      {assignment.fileName}
                                    </a>
                                    <button
                                      onClick={() => handleUpdateTask(assignment.id, { fileUrl: undefined, fileName: undefined })}
                                      className="text-red-500 hover:text-red-700"
                                      title="ลบไฟล์"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                ) : (
                                  <label
                                    htmlFor={`file-${assignment.id}`}
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-xl hover:shadow-lg cursor-pointer transition-all duration-200 transform hover:scale-105"
                                  >
                                    Upload File
                                  </label>
                                )
                              ) : (
                                <span className="text-gray-400">Progress ต้องถึง 100%</span>
                              )}
                            </>
                          )}
                          {assignment.isLeaveRow && (
                            <div className="text-center text-gray-500">-</div>
                          )}
                        </div>
                      </td>
                      <td className="border p-2">
                        <div className="flex justify-center">
                          <button 
                            onClick={() => handleDeleteTask(assignment.id)}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-110"
                            title="ลบ"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-between">
              <button
                type="button"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-medium"
                onClick={() => {
                  const newTask: TaskAssignment = {
                    id: `temp-${Date.now()}`,
                    relateDrawing: '',
                    employeeId: employeeId || '',
                    assignDate: workDate,
                    workingHours: '',
                    overtimeHours: '',
                    progress: '0%',
                    note: '',
                    status: 'pending',
                    isLeaveRow: false
                  };
                  setTaskAssignments([...taskAssignments, newTask]);
                }}
                disabled={!employeeId}
              >
                Add Row
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-medium"
                onClick={handleSubmit}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <RecheckPopup 
        isOpen={isRecheckOpen}
        onClose={() => setIsRecheckOpen(false)}
        onConfirm={handleConfirmSubmit}
        taskAssignments={taskAssignments.filter(task => task.assignDate === workDate)}
        workDate={workDate}
        onEdit={() => {
          // เมื่อกดปุ่ม Edit ให้ปิด popup และให้แก้ไขข้อมูลได้
          setIsRecheckOpen(false);
          
          // ถ้าเป็นวันที่แก้ไขไม่ได้ ให้แจ้งเตือน
          const selectedDateObj = new Date(workDate);
          selectedDateObj.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const twoDaysAgo = new Date(today);
          twoDaysAgo.setDate(today.getDate() - 2);
          
          if (selectedDateObj < twoDaysAgo && selectedDateObj.getTime() !== today.getTime()) {
            alert('ไม่สามารถแก้ไขข้อมูลที่เก่ากว่า 2 วันได้');
            return;
          }
          
          // โหลดข้อมูลของวันที่เลือกมาแสดงในฟอร์ม
          let dateData = null;
          if (typeof window !== 'undefined' && window.localStorage) {
            try {
              const savedData = JSON.parse(localStorage.getItem('dailyReportData') || '{}');
              dateData = savedData[workDate];
            } catch (error) {
              console.error('Error reading localStorage:', error);
            }
          }
          if (dateData && dateData.taskAssignments) {
            setTaskAssignments(dateData.taskAssignments);
          }
        }}
      />

      <ConfirmationPopup
        isOpen={showConfirmation}
        message="คุณมีข้อมูลที่ยังไม่ได้บันทึก คุณแน่ใจหรือไม่ว่าต้องการออกจากหน้านี้?"
        onConfirm={() => {
          // รีเซ็ตข้อมูลทั้งหมดกลับไปยังค่าเริ่มต้น
          setDate(new Date());
          setWorkDate('');
          setEmployeeId('');
          setEmployeeData(null);
          setTaskAssignments([]);
          setError('');
          setHasUnsavedChanges(false);
          setShowConfirmation(false);
          setPendingDate(null);
          setIsRecheckOpen(false);
        }}
        onCancel={() => {
          setShowConfirmation(false);
          setPendingDate(null);
        }}
      />

      </div>
    </div>
  );
}