'use client';

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { getEmployeeByID } from '@/services/employeeService';
import { getEmployeeTaskAssignments, TaskAssignment } from '@/services/taskAssignService';
import { RecheckPopup } from '@/components/RecheckPopup';
import { LeavePopup } from '@/components/LeavePopup';
import { TimeSelector } from '@/components/TimeSelector';
import PageLayout from '@/components/shared/PageLayout'; // Import PageLayout
import { useAuth } from '@/context/AuthContext'; // Import useAuth hook

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

const initialEmptyTask: TaskAssignment = {
  id: `temp-${Date.now()}`,
  relateDrawing: '',
  employeeId: '',
  assignDate: '',
  timeType: 'normal', // Default timeType
  normalWorkingHours: '', // New field
  otWorkingHours: '',     // New field
  progress: '0%',
  note: '',
  status: 'pending'
};

export default function DailyReport() {
  const { appUser } = useAuth(); // Use the auth context to get logged-in user data
  const [date, setDate] = useState<Value>(new Date());
  // Initialize workDate directly with the current date formatted
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [employeeId, setEmployeeId] = useState('');
  const [employeeData, setEmployeeData] = useState<{ employeeId: string; fullName: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([{
    ...initialEmptyTask,
    id: `temp-${Date.now()}` // Ensure unique ID for initial row
  }]);
  const [touchedRows, setTouchedRows] = useState<Set<string>>(new Set()); // Track touched rows by their ID

  // Effect to set employeeId from logged-in user and fetch data
  useEffect(() => {
    if (appUser && appUser.employeeId) {
      setEmployeeId(appUser.employeeId);
    }
  }, [appUser]);

  // Effect to trigger search when employeeId is set (either manually or from appUser)
  useEffect(() => {
    if (employeeId && !employeeData && !loading) { 
      handleEmployeeSearch();
    }
  }, [employeeId]); 

  useEffect(() => {
    if (date instanceof Date) {
      const selectedDate = date.toISOString().split('T')[0];
      setWorkDate(selectedDate);
    }
  }, [date]);


  const handleEmployeeSearch = async () => {
    if (!employeeId) return;
    
    setLoading(true);
    setError('');
    setTaskAssignments([]);
    setTouchedRows(new Set()); // Reset touched rows on new search
    
    try {
      const [employee, assignments] = await Promise.all([
        getEmployeeByID(employeeId),
        getEmployeeTaskAssignments(employeeId)
      ]);
      
      if (employee) {
        setEmployeeData(employee);
        let fetchedAssignments = assignments;
        if (fetchedAssignments.length === 0) {
          // If no assignments, add one empty row
          fetchedAssignments = [{ ...initialEmptyTask, id: `temp-${Date.now()}`, employeeId: employeeId, assignDate: workDate }];
        }
        setTaskAssignments(fetchedAssignments);
      } else {
        setError('ไม่พบข้อมูลพนักงาน');
        setEmployeeData(null);
        setTaskAssignments([{ ...initialEmptyTask, id: `temp-${Date.now()}`, employeeId: employeeId, assignDate: workDate }]); // Always show one empty row
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการค้นหาข้อมูล');
      setEmployeeData(null);
      setTaskAssignments([{ ...initialEmptyTask, id: `temp-${Date.now()}`, employeeId: employeeId, assignDate: workDate }]); // Always show one empty row
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
  };

  const handleDeleteTask = (taskId: string) => {
    if (taskAssignments.length === 1) {
      alert('ต้องมีอย่างน้อย 1 แถว');
      return;
    }
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
      // TODO: Save to Firebase
      console.log({ employeeId, employeeData, workDate, taskAssignments });
      setIsRecheckOpen(false);
      // Show success message or redirect
    } catch (error) {
      console.error('Error submitting data:', error);
      // Show error message
    }
  };

  const handleRowFocus = (rowId: string, idx: number) => {
    if (!touchedRows.has(rowId)) {
      setTouchedRows(prev => new Set(prev).add(rowId));
      // If it's the last row, add a new empty row
      if (idx === taskAssignments.length - 1) {
        setTaskAssignments(prevTasks => [
          ...prevTasks,
          { ...initialEmptyTask, id: `temp-${Date.now()}`, employeeId: employeeId, assignDate: workDate }
        ]);
      }
    }
  };

  return (
    <PageLayout> 
      <div className="container-fluid mx-auto p-4 text-gray-900"> 
        <div className="flex gap-4">
          {/* Left side - Calendar */}
          <div className="w-80">
            <Calendar
              onChange={(value: Value) => {
                setDate(value);
                const selectedDate = value instanceof Date ? value.toISOString().split('T')[0] : '';
                setWorkDate(selectedDate); // Update workDate directly from Calendar onChange

                // ถ้ามีข้อมูลในวันที่เลือก ให้แสดง RecheckPopup
                const hasDataForDate = taskAssignments.some(
                  task => task.assignDate === selectedDate
                );
                if (hasDataForDate) {
                  setIsRecheckOpen(true);
                }
              }}
              value={date}
              className="w-full border rounded-lg shadow-lg bg-white custom-calendar"
              tileClassName={({ date: tileDate, view }) => {
                if (view !== 'month') return '';

                // แปลง tileDate เป็น Date object และตั้งเวลาเป็น 00:00:00
                const tileDateOnly = new Date(tileDate);
                tileDateOnly.setHours(0, 0, 0, 0);

                // วันที่ปัจจุบัน
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // คำนวณวันที่สามารถแก้ไขย้อนหลังได้ (3 วัน)
                const threeDaysAgo = new Date(today);
                threeDaysAgo.setDate(today.getDate() - 3);

                // เช็คว่าเป็นวันที่มีการแก้ไขข้อมูลหรือไม่
                const hasData = taskAssignments.some(task => {
                  if (!task.assignDate) return false;
                  const taskDate = new Date(task.assignDate);
                  taskDate.setHours(0, 0, 0, 0);
                  return taskDate.getTime() === tileDateOnly.getTime();
                });

                // ตรวจสอบเงื่อนไขและส่งคืน class ที่เหมาะสม
                if (tileDateOnly.getTime() === today.getTime()) {
                  return 'rounded-full bg-blue-200'; // วันที่ปัจจุบัน (สีฟ้า)
                }
                if (hasData) {
                  return 'rounded-full bg-yellow-200'; // วันที่มีการแก้ไขข้อมูล (สีเหลือง)
                }
                if (tileDateOnly >= threeDaysAgo && tileDateOnly <= today) {
                  return 'rounded-full bg-green-200'; // วันที่สามารถลงข้อมูลย้อนหลังได้ (สีเขียว)
                }
                
                return '';
              }}
            />
            {/* คำอธิบายสี */}
            <div className="mt-4 space-y-2 text-sm text-gray-800"> 
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-blue-200"></div>
                <span>วันที่ปัจจุบัน</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-yellow-200"></div>
                <span>มีการแก้ไขข้อมูล</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-green-200"></div>
                <span>วันที่สามารถลงข้อมูลย้อนหลังได้</span>
              </div>
            </div>
          </div>

          {/* Right side - Form */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex justify-between mb-6">
                <div className="w-1/2 pr-2">
                  <label className="block text-sm font-medium text-gray-800 mb-1">รหัสพนักงาน</label> 
                  <div className="flex">
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="w-full p-2 border rounded-md text-gray-800" 
                      placeholder="XXXXXX"
                    />
                    <button
                      type="button"
                      onClick={handleEmployeeSearch}
                      className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                      disabled={loading}
                    >
                      {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
                    </button>
                  </div>
                  {error && <p className="mt-1 text-red-500 text-sm">{error}</p>}
                  {employeeData && (
                    <p className="mt-1 text-green-600 text-sm">
                      ชื่อ-นามสกุล: {employeeData.fullName}
                    </p>
                  )}
                </div>
                <div className="w-1/2 pl-2">
                  <label className="block text-sm font-medium text-gray-800 mb-1">วันที่ทำงาน</label> 
                  <div className="relative">
                    <input
                      type="date"
                      value={workDate}
                      readOnly={true} 
                      className="w-full p-2 border rounded-md pr-10 text-gray-800 bg-gray-100 cursor-not-allowed" 
                    />
                    <span className="absolute right-2 top-2">
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"> 
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-gray-900"> 
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left w-12">No</th>
                      <th className="border p-2 text-left w-1/4">Relate Drawing</th>
                      <th className="border p-2 text-left w-32">เวลาปกติ</th> 
                      <th className="border p-2 text-left w-32">เวลา OT</th> 
                      <th className="border p-2 text-left w-40">Progress</th>
                      <th className="border p-2 text-left w-1/4">Note</th>
                      <th className="border p-2 text-left w-40">Upload File</th>
                      <th className="border p-2 text-left w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskAssignments.map((assignment, index) => (
                      <tr key={assignment.id} className={`${
                        assignment.status === 'completed' ? 'bg-green-50' :
                        assignment.status === 'in-progress' ? 'bg-yellow-50' : ''
                      }`}>
                        <td className="border p-2 text-gray-800">{index + 1}</td> 
                        <td className="border p-2">
                          <input
                            type="text"
                            value={assignment.timeType === 'leave' ? 'ลา' : assignment.relateDrawing}
                            onFocus={() => handleRowFocus(assignment.id, index)} 
                            onChange={(e) => handleUpdateTask(assignment.id, { relateDrawing: e.target.value })}
                            className={`border rounded p-1 w-full text-gray-800 ${ 
                              assignment.timeType === 'leave' ? 'bg-red-50 text-red-600' : ''
                            }`}
                            placeholder="ใส่ชื่องาน"
                            readOnly={assignment.timeType === 'leave'}
                          />
                        </td>
                        {/* เวลาปกติ column */}
                        <td className="border p-2 text-gray-800">
                          {assignment.timeType === 'normal' ? (
                            <TimeSelector
                              value={assignment.normalWorkingHours || ''} // Use normalWorkingHours
                              onFocus={() => handleRowFocus(assignment.id, index)} 
                              onChange={(value) => handleUpdateTask(assignment.id, { normalWorkingHours: value, timeType: 'normal' })}
                              type={'normal'}
                            />
                          ) : assignment.timeType === 'leave' ? (
                            <span className="text-red-500">-</span>
                          ) : (
                            <TimeSelector
                              value={assignment.normalWorkingHours || ''} // Use normalWorkingHours
                              onFocus={() => handleRowFocus(assignment.id, index)} 
                              onChange={(value) => handleUpdateTask(assignment.id, { normalWorkingHours: value, timeType: 'normal' })}
                              type={'normal'}
                              disabled={true} // Disabled if not normal time
                            />
                          )}
                        </td>
                        {/* เวลา OT column */}
                        <td className="border p-2 text-gray-800">
                          {assignment.timeType === 'ot' ? (
                            <TimeSelector
                              value={assignment.otWorkingHours || ''} // Use otWorkingHours
                              onFocus={() => handleRowFocus(assignment.id, index)} 
                              onChange={(value) => handleUpdateTask(assignment.id, { otWorkingHours: value, timeType: 'ot' })}
                              type={'ot'}
                            />
                          ) : assignment.timeType === 'leave' ? (
                            <span className="text-red-500">-</span>
                          ) : (
                            <TimeSelector
                              value={assignment.otWorkingHours || ''} // Use otWorkingHours
                              onFocus={() => handleRowFocus(assignment.id, index)} 
                              onChange={(value) => handleUpdateTask(assignment.id, { otWorkingHours: value, timeType: 'ot' })}
                              type={'ot'}
                              disabled={true} // Disabled if not OT time
                            />
                          )}
                        </td>
                        <td className="border p-2">
                          <div className="flex space-x-2">
                            <select
                              value={assignment.status}
                              onFocus={() => handleRowFocus(assignment.id, index)} 
                              onChange={(e) => {
                                const status = e.target.value as TaskAssignment['status'];
                                handleUpdateTask(assignment.id, { status });
                              }}
                              className={`rounded p-1 flex-1 text-gray-800 ${ 
                                assignment.status === 'completed' ? 'bg-green-100' :
                                assignment.status === 'in-progress' ? 'bg-yellow-100' :
                                'bg-gray-100'
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
                              onFocus={() => handleRowFocus(assignment.id, index)} 
                              onChange={(e) => {
                                const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                handleUpdateTask(assignment.id, { 
                                  progress: `${value}%`,
                                  status: value === 100 ? 'completed' : 
                                          value === 0 ? 'pending' : 
                                          'in-progress'
                                });
                              }}
                              className="w-20 rounded p-1 border text-center text-gray-800" 
                              placeholder="0-100"
                            />
                            <span className="flex items-center text-gray-800">%</span> 
                          </div>
                        </td>
                        <td className="border p-2">
                          <input
                            type="text"
                            value={assignment.note || ''}
                            onFocus={() => handleRowFocus(assignment.id, index)} 
                            onChange={(e) => handleUpdateTask(assignment.id, { note: e.target.value })}
                            className="border rounded p-1 w-full text-gray-800" 
                            placeholder="เพิ่มหมายเหตุ"
                          />
                        </td>
                        <td className="border p-2">
                          <div className="flex items-center justify-center">
                            <input
                              type="file"
                              id={`file-${assignment.id}`}
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // TODO: Implement file upload to Firebase Storage
                                  console.log('Uploading file:', file);
                                  // Show loading state
                                  handleUpdateTask(assignment.id, { isUploading: true });
                                  
                                  // Simulate upload delay (remove this in production)
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
                                <div className="flex items-center space-x-2 text-gray-700"> 
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
                                  className="bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200 cursor-pointer"
                                >
                                  Upload File
                                </label>
                              )
                            ) : (
                              <span className="text-gray-600">Progress ต้องถึง 100%</span> 
                            )}
                          </div>
                        </td>
                        <td className="border p-2">
                          <div className="flex justify-center">
                            <button 
                              onClick={() => handleDeleteTask(assignment.id)}
                              className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
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

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
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
            // เมื่อกดปุ่ม Edit จะโหลดข้อมูลของวันที่เลือกมาแสดงในฟอร์ม
            const dateData = taskAssignments.filter(task => task.assignDate === workDate);
            if (dateData.length > 0) {
              setTaskAssignments(dateData);
            }
          }}
        />
        
        <LeavePopup
          isOpen={showLeavePopup}
          onClose={() => {
            setShowLeavePopup(false);
            if (currentTaskId) {
              handleUpdateTask(currentTaskId, {
                timeType: 'normal',
                leaveData: undefined
              });
            }
          }}
          onSubmit={(leaveData) => {
            if (currentTaskId) {
              handleUpdateTask(currentTaskId, {
                timeType: 'leave',
                leaveData,
                workingHours: leaveData.leaveHours
              });
              setShowLeavePopup(false);
            }
          }}
        />
      </div>
    </PageLayout>
  );
}