'use client';

import { useState, useEffect, useCallback, useId, useMemo } from 'react';
import Calendar from 'react-calendar';
import '../custom-calendar.css';
import { getEmployeeByID } from '@/services/employeeService';
import { getEmployeeTaskAssignments, TaskAssignment } from '@/services/taskAssignService';
import { RecheckPopup } from '@/components/RecheckPopup';
import { LeavePopup } from '@/components/LeavePopup';
import { TimeSelector } from '@/components/TimeSelector';
import { useAuth } from '@/context/AuthContext';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

const createInitialEmptyDailyReportEntry = (employeeId: string, assignDate: string, baseId: string, index: number): TaskAssignment => ({
  id: `${baseId}-temp-${index}`,
  employeeId, assignDate, subtaskId: '', normalWorkingHours: '0:0', otWorkingHours: '0:0', progress: '0%', 
  note: '', status: 'pending', subTaskName: '', subTaskCategory: '', internalRev: '', 
  subTaskScale: '', project: '', taskName: '', remark: '', item: '',
});

const hourOptions = Array.from({ length: 13 }, (_, i) => i);
const minuteOptions = [0, 15, 30, 45];

export default function DailyReport() {
  const { appUser } = useAuth();
  const baseId = useId();
  const [date, setDate] = useState<Value>(new Date());
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [employeeId, setEmployeeId] = useState('');
  const [employeeData, setEmployeeData] = useState<{ employeeId: string; fullName: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isRecheckOpen, setIsRecheckOpen] = useState(false);
  const [showLeavePopup, setShowLeavePopup] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);


  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);
  const [dailyReportEntries, setDailyReportEntries] = useState<TaskAssignment[]>([]);

  const selectedSubtaskIds = useMemo(() => {
    const ids = new Set<string>();
    dailyReportEntries.forEach(entry => {
      if (entry.subtaskId) ids.add(entry.subtaskId);
    });
    return ids;
  }, [dailyReportEntries]);

  const fetchAllData = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError('');
    
    try {
      const employee = await getEmployeeByID(employeeId);
      const assignments = await getEmployeeTaskAssignments(employeeId);
      
      if (employee) {
        setEmployeeData(employee);
        setTaskAssignments(assignments);
      } else {
        setError('ไม่พบข้อมูลพนักงาน');
        setEmployeeData(null);
        setTaskAssignments([createInitialEmptyDailyReportEntry(employeeId, workDate, baseId, 0)]);
      }
    } catch (err) { console.error(err); setError('เกิดข้อผิดพลาด'); } 
    finally { setLoading(false); }
  }, [employeeId, workDate, baseId]);

  useEffect(() => { if (appUser?.employeeId) setEmployeeId(appUser.employeeId); }, [appUser]);
  useEffect(() => { fetchAllData(); }, [fetchAllData]);
  useEffect(() => { if (date instanceof Date) setWorkDate(date.toISOString().split('T')[0]); }, [date]);

  const handleUpdateTask = (taskId: string, updates: Partial<TaskAssignment>) => {
    setTaskAssignments(tasks => 
      tasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      )
    );
  };

  const handleDeleteTask = (taskId: string) => {
    if (taskAssignments.length <= 1) return alert('ต้องมีอย่างน้อย 1 แถว');
    if (window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
      setTaskAssignments(tasks => tasks.filter(task => task.id !== taskId));
    }
  };
  
  const handleAddRow = () => {
    setTaskAssignments(prev => [...prev, createInitialEmptyDailyReportEntry(employeeId, workDate, baseId, prev.length)]);
  };

  const handleEmployeeSearch = () => {
    fetchAllData();
  };

  const handleUpdateEntry = (entryId: string, updates: Partial<TaskAssignment>) => {
    setDailyReportEntries(entries =>
      entries.map(entry => (entry.id === entryId ? { ...entry, ...updates } : entry))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
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

  return (
    <div className="container-fluid mx-auto p-4">
      <div className="flex gap-4">
        {/* Left side - Calendar */}
        <div className="w-80">
          <Calendar
            onChange={(value: Value) => {
              if (value instanceof Date) {
                const selectedDate = value.toISOString().split('T')[0];
                setDate(value);
                setWorkDate(selectedDate);
                
                // ถ้ามีข้อมูลในวันที่เลือก ให้แสดง RecheckPopup
                const hasDataForDate = taskAssignments.some(
                  task => task.assignDate === selectedDate
                );
                if (hasDataForDate) {
                  setIsRecheckOpen(true);
                }
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
          <div className="mt-4 space-y-2 text-sm">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสพนักงาน</label>
                <div className="flex">
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full p-2 border rounded-md"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ทำงาน</label>
                <div className="relative">
                  <input
                    type="date"
                    value={workDate}
                    onChange={(e) => setWorkDate(e.target.value)}
                    className="w-full p-2 border rounded-md pr-10"
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
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left w-12">No</th>
                    <th className="border p-2 text-left w-1/4">Relate Drawing</th>
                    <th className="border p-2 text-left w-32">Time</th>
                    <th className="border p-2 text-left w-32">Working hours</th>
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
                      <td className="border p-2">{index + 1}</td>
                      <td className="border p-2">
                        <input
                          type="text"
                          value={assignment.timeType === 'leave' ? 'ลา' : assignment.relateDrawing}
                          onChange={(e) => handleUpdateTask(assignment.id, { relateDrawing: e.target.value })}
                          className={`border rounded p-1 w-full ${
                            assignment.timeType === 'leave' ? 'bg-red-50 text-red-600' : ''
                          }`}
                          placeholder="ใส่ชื่องาน"
                          readOnly={assignment.timeType === 'leave'}
                        />
                      </td>
                      <td className="border p-2">
                        <select
                          value={assignment.timeType || 'normal'}
                          onChange={(e) => {
                            const newTimeType = e.target.value as TaskAssignment['timeType'];
                            if (newTimeType === 'leave') {
                              handleUpdateTask(assignment.id, {
                                timeType: newTimeType,
                                relateDrawing: 'ลา',
                                workingHours: '-'
                              });
                              setCurrentTaskId(assignment.id);
                              setShowLeavePopup(true);
                            } else {
                              handleUpdateTask(assignment.id, { 
                                timeType: newTimeType,
                                workingHours: '',
                                leaveData: undefined,
                                relateDrawing: ''
                              });
                            }
                          }}
                          className={`rounded p-1 w-full ${
                            assignment.timeType === 'ot' ? 'bg-blue-50 text-blue-600' :
                            assignment.timeType === 'leave' ? 'bg-red-50 text-red-600' :
                            'bg-green-50 text-green-600'
                          }`}
                        >
                          <option value="normal">เวลาปกติ</option>
                          <option value="ot">เวลาโอที</option>
                          <option value="leave">ลา</option>
                        </select>
                      </td>
                      <td className="border p-2">
                        {assignment.timeType !== 'leave' ? (
                          <TimeSelector
                            value={assignment.workingHours || ''}
                            onChange={(value) => handleUpdateTask(assignment.id, { workingHours: value })}
                            type={assignment.timeType === 'ot' ? 'ot' : 'normal'}
                          />
                        ) : (
                          <span className="text-red-500">-</span>
                        )}
                      </td>
                      <td className="border p-2">
                        <div className="flex space-x-2">
                          <select
                            value={assignment.status}
                            onChange={(e) => {
                              const status = e.target.value as TaskAssignment['status'];
                              handleUpdateTask(assignment.id, { status });
                            }}
                            className={`rounded p-1 flex-1 ${
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
                            onChange={(e) => {
                              const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                              handleUpdateTask(assignment.id, { 
                                progress: `${value}%`,
                                status: value === 100 ? 'completed' : 
                                        value === 0 ? 'pending' : 
                                        'in-progress'
                              });
                            }}
                            className="w-20 rounded p-1 border text-center"
                            placeholder="0-100"
                          />
                          <span className="flex items-center">%</span>
                        </div>
                      </td>
                      <td className="border p-2">
                        <input
                          type="text"
                          value={assignment.note || ''}
                          onChange={(e) => handleUpdateTask(assignment.id, { note: e.target.value })}
                          className="border rounded p-1 w-full"
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
                                className="bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200 cursor-pointer"
                              >
                                Upload File
                              </label>
                            )
                          ) : (
                            <span className="text-gray-400">Progress ต้องถึง 100%</span>
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

            <div className="mt-4 flex justify-between">
              <button
                type="button"
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                onClick={() => {
                  const newTask: TaskAssignment = {
                    id: `temp-${Date.now()}`, // temporary ID until saved to Firebase
                    relateDrawing: '',
                    employeeId: employeeId || '',
                    assignDate: new Date().toISOString().split('T')[0],
                    time: '',
                    workingHours: '',
                    progress: '0%',
                    note: '',
                    status: 'pending'
                  };
                  setTaskAssignments([...taskAssignments, newTask]);
                }}
                disabled={!employeeId}
              >
                Add Row
              </button>
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
  );
}
