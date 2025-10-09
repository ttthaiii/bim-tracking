'use client';

import { useState, useEffect, useCallback, useId, useRef } from 'react';
import Calendar from 'react-calendar';
import '../custom-calendar.css';
import { getEmployeeByID } from '@/services/employeeService';
import { getEmployeeDailyReportEntries, fetchAvailableSubtasksForEmployee, saveDailyReportEntries, getUploadedFilesForEmployee, UploadedFile } from '@/services/taskAssignService';
import PageLayout from '@/components/shared/PageLayout';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/context/DashboardContext';
import { DailyReportEntry, Subtask } from '@/types/database';
import type { Project } from '@/lib/projects';
import { getProjects } from '@/lib/projects';
import { SubtaskAutocomplete } from '@/components/SubtaskAutocomplete';
import Select from '@/components/ui/Select';
import { RecheckPopup } from '@/components/RecheckPopup';
import { HistoryModal } from '@/components/HistoryModal'; // Import the new modal
import isEqual from 'lodash.isequal';
import { Timestamp } from 'firebase/firestore';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

const createInitialEmptyDailyReportEntry = (employeeId: string, assignDate: string, baseId: string, index: number): DailyReportEntry => ({
  id: `${baseId}-temp-${index}`,
  employeeId, assignDate, subtaskId: '', subtaskPath: '',
  normalWorkingHours: '0:0', otWorkingHours: '0:0', progress: '0%',
  note: '', status: 'pending', subTaskName: 'N/A', subTaskCategory: '', internalRev: '',
  subTaskScale: '', project: '', taskName: '', remark: '', item: '', relateDrawing: '',
  isLeaveTask: false,
  initialProgress: 0,
  progressError: '',
});

const hourOptions = Array.from({ length: 13 }, (_, i) => ({ value: i.toString(), label: `${i} ชั่วโมง` }));
const minuteOptions = [0, 15, 30, 45].map(m => ({ value: m.toString(), label: `${m} นาที` }));

const generateRelateDrawingText = (entry: DailyReportEntry, projects: Project[]): string => {
  if (!entry.subtaskId) return '';
  const project = projects.find(p => p.id === entry.project);
  let parts = [];
  if (project) parts.push(project.abbr);
  if (entry.taskName) parts.push(entry.taskName);
  if (entry.subTaskName) parts.push(entry.subTaskName);
  if (entry.item) parts.push(entry.item);
  return parts.length > 0 ? `(${parts.join(' - ')})` : '';
};

export default function DailyReport() {
  const { appUser } = useAuth();
  const { setHasUnsavedChanges } = useDashboard();
  const baseId = useId();
  const [date, setDate] = useState<Value>(new Date());
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [employeeId, setEmployeeId] = useState('');
  const [employeeData, setEmployeeData] = useState<{ employeeId: string; fullName: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isRecheckOpen, setIsRecheckOpen] = useState(false);
  const [isFutureDate, setIsFutureDate] = useState(false);
  
  const [reportDataCache, setReportDataCache] = useState<Record<string, DailyReportEntry[]>>({});
  const [allDailyEntries, setAllDailyEntries] = useState<DailyReportEntry[]>([]);
  const [dailyReportEntries, setDailyReportEntries] = useState<DailyReportEntry[]>([]);
  
  const [touchedRows, setTouchedRows] = useState<Set<string>>(new Set());
  const [editableRows, setEditableRows] = useState<Set<string>>(new Set());
  const [availableSubtasks, setAvailableSubtasks] = useState<Subtask[]>([]);
  const [filteredSubtasks, setFilteredSubtasks] = useState<Subtask[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const prevWorkDateRef = useRef<string>(workDate);
  const [entriesToSubmit, setEntriesToSubmit] = useState<DailyReportEntry[]>([]);

  // States for History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  // historyLogs will now be grouped by timestamp
  const [historyLogsGrouped, setHistoryLogsGrouped] = useState<Record<string, DailyReportEntry[]>>({});

  const handleShowHistory = () => {
    const entriesForDate = allDailyEntries.filter(entry => entry.assignDate === workDate);
    const groupedLogs: Record<string, DailyReportEntry[]> = {};

    entriesForDate.forEach(entry => {
      // Round timestamp to the nearest second to group entries submitted at roughly the same time
      const timestampKey = entry.logTimestamp?.toMillis() ? String(Math.floor(entry.logTimestamp.toMillis() / 1000) * 1000) : 'no-timestamp';
      if (!groupedLogs[timestampKey]) {
        groupedLogs[timestampKey] = [];
      }
      groupedLogs[timestampKey].push(entry);
    });

    // Sort timestamps in descending order (newest first)
    const sortedTimestamps = Object.keys(groupedLogs).sort((a, b) => parseInt(b) - parseInt(a));
    const sortedGroupedLogs: Record<string, DailyReportEntry[]> = {};
    sortedTimestamps.forEach(ts => {
      // Sort entries within each timestamp by subtask name for consistent display
      groupedLogs[ts].sort((a, b) => (a.subTaskName || '').localeCompare(b.subTaskName || ''));
      sortedGroupedLogs[ts] = groupedLogs[ts];
    });
    
    setHistoryLogsGrouped(sortedGroupedLogs);
    setShowHistoryModal(true);
  };
  
  useEffect(() => {
    const originalData = allDailyEntries.filter(entry => entry.assignDate === workDate);
    const currentData = reportDataCache[workDate];
    
    const normalize = (entries: DailyReportEntry[] = []) => 
      entries.map(({ id, relateDrawing, ...rest }) => ({ ...rest, id: id.startsWith('temp-') ? '' : id }));

    if (originalData.length === 0 && currentData && currentData.some(d => d.subtaskId)) {
        setHasUnsavedChanges(true);
    } else {
        setHasUnsavedChanges(!isEqual(normalize(originalData), normalize(currentData)));
    }
  }, [reportDataCache, workDate, allDailyEntries, setHasUnsavedChanges]);

  const fetchAllData = useCallback(async (eid: string) => {
    setLoading(true);
    setError('');
    try {
      const [employee, dailyEntries, projects, subtasks, files] = await Promise.all([
        getEmployeeByID(eid),
        getEmployeeDailyReportEntries(eid),
        getProjects(),
        fetchAvailableSubtasksForEmployee(eid),
        getUploadedFilesForEmployee(eid),
      ]);
      
      setAllProjects(projects);
      setAvailableSubtasks(subtasks);
      setUploadedFiles(files);
      setAllDailyEntries(dailyEntries);

      if (employee) setEmployeeData(employee);
      else {
        setError('ไม่พบข้อมูลพนักงาน');
        setEmployeeData(null);
      }
    } catch (err) {
      console.error('Error fetching all data:', err);
      setError('เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (appUser?.employeeId && !employeeId) {
      setEmployeeId(appUser.employeeId);
      fetchAllData(appUser.employeeId);
    }
  }, [appUser, employeeId, fetchAllData]);

  useEffect(() => {
    if (date instanceof Date) {
      const selectedDateLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const todayLocal = new Date();
      todayLocal.setHours(0, 0, 0, 0);
      
      setIsFutureDate(selectedDateLocal > todayLocal);
      
      const twoDaysAgoLocal = new Date(todayLocal);
      twoDaysAgoLocal.setDate(todayLocal.getDate() - 2);

      setIsReadOnly(selectedDateLocal < twoDaysAgoLocal);

      const year = selectedDateLocal.getFullYear();
      const month = String(selectedDateLocal.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDateLocal.getDate()).padStart(2, '0');
      setWorkDate(`${year}-${month}-${day}`);
    }
  }, [date]);

  // Filter subtasks based on whether the date is in the future
  useEffect(() => {
    if (isFutureDate) {
      const leaveTasks = availableSubtasks.filter(
        subtask => (subtask.taskName || '').includes('ลา') || (subtask.subTaskName || '').includes('ลา')
      );
      setFilteredSubtasks(leaveTasks);
    } else {
      setFilteredSubtasks(availableSubtasks);
    }
  }, [isFutureDate, availableSubtasks]);

  // THIS IS THE KEY LOGIC: Filter allDailyEntries to show only the latest log for the selected workDate
  useEffect(() => {
    if (!employeeId || !workDate) return;

    const entriesForDate = allDailyEntries.filter((entry: DailyReportEntry) => entry.assignDate === workDate);

    if (entriesForDate.length === 0) {
        const initialEntry = createInitialEmptyDailyReportEntry(employeeId, workDate, baseId, 0);
        setDailyReportEntries([{
            ...initialEntry,
            isExistingData: false,
            logTimestamp: Timestamp.now() // Add logTimestamp
        }]);
        setEditableRows(new Set()); // เคลียร์ editableRows เพราะเป็นข้อมูลใหม่ แก้ไขได้เลย
        return;
    }    

    // 1. Find the absolute latest timestamp in milliseconds
    const latestTimestampMillis = Math.max(...entriesForDate.map((entry: DailyReportEntry) => entry.logTimestamp?.toMillis() || 0));

    // 2. Round this latest timestamp down to the nearest second
    const latestTimestampSecond = Math.floor(latestTimestampMillis / 1000) * 1000;

    // 3. Filter for all entries that fall within the same second as the latest entry
    const latestSubmissionEntries = entriesForDate.filter((entry: DailyReportEntry) => {
        const entryTimestampSecond = Math.floor((entry.logTimestamp?.toMillis() || 0) / 1000) * 1000;
        return entryTimestampSecond === latestTimestampSecond;
    });

    // 4. Set the entries to show, and importantly, set initialProgress from the entry's actual progress
    const entriesToShow = latestSubmissionEntries.map((entry: DailyReportEntry) => {
        // ตรวจสอบว่าเป็นงานลาหรือไม่ จาก subtask ที่เกี่ยวข้อง
        const subtask = availableSubtasks.find(sub => sub.id === entry.subtaskId);
        const isLeaveTask = subtask ? 
          (subtask.taskName?.includes('ลา') || subtask.subTaskName?.includes('ลา')) : 
          (entry.taskName?.includes('ลา') || entry.subTaskName?.includes('ลา'));

        return {
          ...entry,
          isLeaveTask,
          initialProgress: isLeaveTask ? 0 : (parseInt(entry.progress.replace('%', ''), 10) || 0),
          progress: isLeaveTask ? '0%' : entry.progress,
          isExistingData: true, // เป็นข้อมูลเก่า (มี logTimestamp)
        };
    });
    
    setDailyReportEntries(entriesToShow);
    setEditableRows(new Set()); // เริ่มต้นล็อคทุกแถวที่เป็นข้อมูลเก่า
  }, [workDate, allDailyEntries, employeeId, baseId, availableSubtasks]);

  const handleUpdateEntry = (entryId: string, updates: Partial<DailyReportEntry>) => {
    setDailyReportEntries((currentEntries: DailyReportEntry[]) => {
      const newEntries = currentEntries.map((entry: DailyReportEntry) => {
        if (entry.id === entryId) {
          const newEntry = { ...entry, ...updates };
          const progress = parseInt(newEntry.progress);
          if (progress === 100) newEntry.status = 'completed';
          else if (progress > 0) newEntry.status = 'in-progress';
          else newEntry.status = 'pending';
          return newEntry;
        }
        return entry;
      });
      return newEntries; // Ensure the newEntries array is returned here
    });
  };

  const handleRowFocus = (entryId: string, idx: number) => {
    if (idx === dailyReportEntries.length - 1) {
      handleAddRow();
    }
    if (!touchedRows.has(entryId)) {
      setTouchedRows((prev: Set<string>) => new Set(prev).add(entryId));
    }
  };

  const toggleRowEdit = (entryId: string) => {
    setEditableRows((prev: Set<string>) => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const handleTimeChange = (entryId: string, type: 'normalWorkingHours' | 'otWorkingHours', part: 'h' | 'm', value: string) => {
    const currentEntry = dailyReportEntries.find(e => e.id === entryId);
    if (!currentEntry) return;
    let [h, m] = (currentEntry[type] || '0:0').split(':').map(Number);
    if (part === 'h') h = Number(value);
    if (part === 'm') m = Number(value);
    handleUpdateEntry(entryId, { [type]: `${h}:${m}` });
  };

  const handleDeleteEntry = (entryId: string) => {
    // Don't allow deletion if there's only one row
    if (dailyReportEntries.length <= 1) {
      return;
    }

    setDailyReportEntries(currentEntries => {
      const newEntries = currentEntries.filter(entry => entry.id !== entryId);
      // If all entries are deleted, add one empty row
      if (newEntries.length === 0) {
        return [createInitialEmptyDailyReportEntry(employeeId, workDate, baseId, 0)];
      }
      return newEntries;
    });

    // Update unsaved changes state
    setHasUnsavedChanges(true);
  };
  
  const handleAddRow = () => {
    setDailyReportEntries(currentEntries => {
      // Prevent adding a new row if the last one is empty
      if (currentEntries.length > 0 && !currentEntries[currentEntries.length - 1].subtaskId) {
        return currentEntries;
      }
      return [...currentEntries, createInitialEmptyDailyReportEntry(employeeId, workDate, baseId, currentEntries.length)];
    });
  };

  const handleProgressInput = (entryId: string, newProgressValue: string) => {
    const entry = dailyReportEntries.find(e => e.id === entryId);
    if (!entry) return;

    // ถ้าเป็นงานลา ให้ progress เป็น 0 เสมอ
    if (entry.isLeaveTask) {
      handleUpdateEntry(entryId, { progress: '0', progressError: '' });
      return;
    }

    const newProgress = parseInt(newProgressValue, 10);
    const initialProgress = entry.initialProgress || 0;
  
    let progressError = '';
    if (!isNaN(newProgress) && newProgress < initialProgress) {
      progressError = `ค่าต้องไม่น้อยกว่าค่าเริ่มต้น (${initialProgress}%)`;
    }
  
    handleUpdateEntry(entryId, { progress: newProgressValue, progressError });
  };
  
  const handleProgressValidation = (entryId: string) => {
    const entry = dailyReportEntries.find(e => e.id === entryId);
    if (!entry) return;

    // ถ้าเป็นงานลา ให้ progress เป็น 0 เสมอ
    if (entry.isLeaveTask) {
      handleUpdateEntry(entryId, { progress: '0%', progressError: '' });
      return;
    }

    const currentProgress = parseInt(entry.progress, 10);
    const initialProgress = entry.initialProgress || 0;

    if (isNaN(currentProgress) || currentProgress < initialProgress) {
      handleUpdateEntry(entryId, { progress: `${initialProgress}%`, progressError: '' });
    } else {
      handleUpdateEntry(entryId, { progressError: '' });
    }
  };

  const handleRelateDrawingChange = (entryId: string, subtaskId: string | null) => {
    const selectedSubtask = subtaskId ? availableSubtasks.find(sub => sub.id === subtaskId) : null;
    
    let project: Project | null = null;
    if (selectedSubtask) {
        project = allProjects.find(p => p.id === selectedSubtask.projectId) || 
                  allProjects.find(p => p.id === selectedSubtask.project) || 
                  allProjects.find(p => p.name === selectedSubtask.project) || 
                  null;
    }

    const isLeave = selectedSubtask?.taskName?.includes('ลา') || selectedSubtask?.subTaskName?.includes('ลา') || false;
    // Note: initialProgress here is for newly selected subtask, not for existing entry validation.
    const newSubtaskInitialProgress = selectedSubtask?.subTaskProgress || 0;

    const updates: Partial<DailyReportEntry> = selectedSubtask ? {
        subtaskId: selectedSubtask.id,
        subtaskPath: selectedSubtask.path || '',
        subTaskName: selectedSubtask.subTaskName,
        subTaskCategory: selectedSubtask.subTaskCategory,
        progress: isLeave ? '0%' : `${newSubtaskInitialProgress}%`,
        note: selectedSubtask.remark,
        internalRev: selectedSubtask.internalRev,
        subTaskScale: selectedSubtask.subTaskScale,
        project: project ? project.id : '',
        taskName: selectedSubtask.taskName,
        item: selectedSubtask.item,
        status: 'pending',
        isLeaveTask: isLeave,
        otWorkingHours: isLeave ? '0:0' : '0:0',
        initialProgress: isLeave ? 0 : newSubtaskInitialProgress,
        progressError: '',
    } : { 
        subtaskId: '', subtaskPath: '', progress: '0%', note: '', item: '', status: 'pending', relateDrawing: '', isLeaveTask: false, initialProgress: 0, progressError: '',
    };
    handleUpdateEntry(entryId, updates);

    // ถ้ามีการเลือก Task และเป็นแถวสุดท้าย ให้เพิ่มแถวใหม่อัตโนมัติ
    if (selectedSubtask) {
      const currentIndex = dailyReportEntries.findIndex(entry => entry.id === entryId);
      if (currentIndex === dailyReportEntries.length - 1) {
        handleAddRow();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setError('ไม่พบรหัสพนักงาน ไม่สามารถบันทึกได้');
      return;
    }

    const validEntries = dailyReportEntries.filter(entry => entry.subtaskId);

    if (validEntries.length === 0) {
      alert('กรุณาเลือก Task อย่างน้อย 1 รายการ');
      return;
    }

    // Prepare data for RecheckPopup with old progress info
    const entriesForRecheck = validEntries.map(entry => {
      const fullTaskName = generateRelateDrawingText(entry, allProjects);
      // หา progress เดิมจาก allDailyEntries
      const existingEntry = allDailyEntries.find(e => 
        e.assignDate === workDate && 
        e.subtaskId === entry.subtaskId
      );
      const oldProgress = existingEntry?.progress || '0%';
      
      return {
        ...entry,
        relateDrawing: fullTaskName,
        progress: `${entry.progress}`,
        oldProgress, // เพิ่ม progress เดิม
      };
    });

    setEntriesToSubmit(entriesForRecheck);
    setIsRecheckOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setIsRecheckOpen(false);
    setLoading(true);
    setError('');
    try {
      const entriesToSave = entriesToSubmit.map(entry => ({
        ...entry,
        assignDate: workDate,
      }));

      await saveDailyReportEntries(employeeId, entriesToSave);
      
      alert('บันทึกข้อมูล Daily Report สำเร็จ!');
      setHasUnsavedChanges(false);
      
      setReportDataCache({});
      await fetchAllData(employeeId);
      // The useEffect will handle resetting the dailyReportEntries correctly
    } catch (err) {
      console.error('Error submitting daily report:', err);
      setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล Daily Report');
    } finally {
      setLoading(false);
    }
  };
  
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const classes = [];
      const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const normalizedDateTimestamp = normalizedDate.getTime();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if the day is Sunday (getDay() returns 0 for Sunday)
      const isSunday = date.getDay() === 0;

      if (normalizedDate < today) {
        const entriesForDate = allDailyEntries.filter(entry => {
            const entryDate = new Date(entry.assignDate);
            return new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate()).getTime() === normalizedDateTimestamp;
        });

        // Only add 'has-missing-data-marker' if it's not a Sunday and there are no entries
        if (entriesForDate.length === 0 && !isSunday) {
            classes.push('has-missing-data-marker');
        } else {
            const uniqueTimestamps = new Set(
                entriesForDate.map(e => Math.floor((e.logTimestamp?.toMillis() || 0) / 1000))
            );
            if (uniqueTimestamps.size > 1) {
                classes.push('has-edit-marker');
            }
        }
      }
      
      return classes.length > 0 ? classes.join(' ') : '';
    }
    return '';
  };

  return (
    <PageLayout>
      <div className="container-fluid mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
        {/* Main Content */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Calendar and Legend Section */}
          <div className="w-full md:w-[384px] md:flex-shrink-0">
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <Calendar onChange={setDate} value={date} className="custom-calendar" locale="th-TH" tileClassName={tileClassName} />
            </div>
            <div className="mt-4 p-4 bg-white rounded-lg shadow-md border border-gray-200 text-xs text-gray-700 space-y-2">
              <div className="flex items-center"><div className="w-3 h-3 rounded-sm bg-blue-500 mr-2"></div><span>วันที่เลือก</span></div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-sm bg-orange-500 mr-2"></div><span>วันที่ปัจจุบัน</span></div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span><span>วันที่ยังไม่มีการลงข้อมูล</span></div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></span><span>วันที่มีการแก้ไข</span></div>
            </div>
          </div>

          {/* Form Section */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 min-h-[80vh]">
              {/* Header Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">รหัสพนักงาน</label>
                  <input type="text" value={employeeId} readOnly className="w-full p-2 border border-gray-300 rounded-md text-sm bg-gray-100 text-gray-900 cursor-not-allowed" placeholder="กำลังโหลด..."/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">วันที่ทำงาน</label>
                  <input type="date" value={workDate} readOnly className="w-full p-2 border border-gray-300 rounded-md text-sm bg-gray-100 text-gray-900 cursor-not-allowed"/>
                </div>
              </div>

              {/* Status Messages */}
              {loading && <p>Loading...</p>}
              {error && <p className="mb-4 text-red-500 text-sm">โค้ดผิดพลาด</p>}
              {employeeData && <p className="mb-4 text-sm font-semibold text-gray-800">ชื่อ-นามสกุล: {employeeData.fullName}</p>}

              {/* Table Section */}
              <div className="flex flex-col h-[calc(100vh-300px)]">
                <div className="flex-grow overflow-x-auto overflow-y-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead className="sticky top-0 bg-orange-500">
                      <tr className="text-white">
                        <th className="p-2 font-semibold text-left w-10">No</th>
                        <th className="p-2 font-semibold text-left w-1/3">Relate Drawing</th>
                        <th className="p-2 font-semibold text-left">เวลาทำงาน / Working Hours</th>
                        <th className="p-2 font-semibold text-left">เวลาโอที / Overtime</th>
                        <th className="p-2 font-semibold text-left">Progress</th>
                        <th className="p-2 font-semibold text-left">Note</th>
                        <th className="p-2 font-semibold text-left">Upload File</th>
                        <th className="p-2 font-semibold text-center w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyReportEntries.map((entry, index) => {
                        const relevantFile = uploadedFiles.find(file => file.subtaskId === entry.subtaskId && file.workDate === entry.assignDate);
                        const fullTaskName = generateRelateDrawingText(entry, allProjects);
                        return (
                          <tr key={entry.id} className="bg-yellow-50 border-b border-yellow-200">
                            <td className="p-2 border-r border-yellow-200 text-center text-gray-800">{index + 1}</td>
                            <td className="p-2 border-r border-yellow-200">
                              <SubtaskAutocomplete
                                entryId={entry.id}
                                value={entry.subtaskId}
                                options={filteredSubtasks}
                                allProjects={allProjects}
                                onChange={handleRelateDrawingChange}
                                onFocus={() => handleRowFocus(entry.id, index)}
                                isDisabled={isReadOnly && !isFutureDate}
                              />
                            </td>
                            <td className="p-2 border-r border-yellow-200">
                              <div className="flex items-center gap-1">
                                <Select 
                                  value={String((entry.normalWorkingHours || '0:0').split(':')[0])} 
                                  onChange={value => handleTimeChange(entry.id, 'normalWorkingHours', 'h', value)} 
                                  options={hourOptions} 
                                  disabled={isReadOnly || (entry.isExistingData && !editableRows.has(entry.id))} 
                                />
                                <Select 
                                  value={String((entry.normalWorkingHours || '0:0').split(':')[1])} 
                                  onChange={value => handleTimeChange(entry.id, 'normalWorkingHours', 'm', value)} 
                                  options={minuteOptions} 
                                  disabled={Boolean(isReadOnly || (entry.subtaskId && !editableRows.has(entry.id)))} 
                                />
                              </div>
                            </td>
                            <td className="p-2 border-r border-yellow-200">
                              <div className="flex items-center gap-1">
                                <Select 
                                  value={String((entry.otWorkingHours || '0:0').split(':')[0])} 
                                  onChange={value => handleTimeChange(entry.id, 'otWorkingHours', 'h', value)} 
                                  options={hourOptions} 
                                  disabled={isReadOnly || entry.isLeaveTask || (entry.subtaskId && !editableRows.has(entry.id))} 
                                />
                                <Select 
                                  value={String((entry.otWorkingHours || '0:0').split(':')[1])} 
                                  onChange={value => handleTimeChange(entry.id, 'otWorkingHours', 'm', value)} 
                                  options={minuteOptions} 
                                  disabled={isReadOnly || entry.isLeaveTask || (entry.subtaskId && !editableRows.has(entry.id))} 
                                />
                              </div>
                            </td>
                            <td className="p-2 border-r border-yellow-200">
                              <div title={entry.progressError || `Progress ต้องไม่น้อยกว่า ${entry.initialProgress || 0}%`}>
                                <div className="flex items-center gap-1">
                                  <input 
                                    type="number" 
                                    value={entry.progress.replace('%', '')} 
                                    onChange={(e) => handleProgressInput(entry.id, e.target.value)} 
                                    onBlur={() => handleProgressValidation(entry.id)} 
                                    className={`w-14 p-1 border rounded-md text-center text-xs ${
                                      entry.isExistingData && !editableRows.has(entry.id)
                                        ? 'bg-gray-100 border-gray-200 text-gray-700'
                                        : 'border-gray-300 text-gray-900'
                                    }`}
                                    disabled={Boolean(isReadOnly || entry.isLeaveTask || isFutureDate || (entry.subtaskId && !editableRows.has(entry.id)))} 
                                  />
                                  <span className="text-gray-800">%</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-2 border-r border-yellow-200">
                              <input 
                                type="text" 
                                value={entry.note || ''} 
                                onChange={(e) => handleUpdateEntry(entry.id, { note: e.target.value })} 
                                className={`w-full p-1 border rounded-md text-xs ${
                                  !editableRows.has(entry.id)
                                    ? 'bg-gray-100 border-gray-200 text-gray-700'
                                    : 'border-gray-300 text-gray-900'
                                }`}
                                placeholder="เพิ่มหมายเหตุ" 
                                disabled={isReadOnly || isFutureDate || !editableRows.has(entry.id)}
                              />
                            </td>
                            <td className="p-2 border-r border-yellow-200 text-center">
                              {relevantFile ? (
                                <a href={relevantFile.fileURL} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 font-semibold">
                                  Download
                                </a>
                              ) : (
                                <span className="text-gray-500">ยังไม่มีไฟล์</span>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {!isReadOnly && (
                                  <>
                                    {/* แสดงปุ่ม Edit เฉพาะเมื่อเป็นข้อมูลเก่า (มี logTimestamp) */}
                                    {entry.isExistingData && (
                                      <button 
                                        onClick={() => toggleRowEdit(entry.id)}
                                        className={`p-1 rounded-full transition-colors ${
                                          editableRows.has(entry.id)
                                            ? 'text-green-500 hover:text-green-700 hover:bg-green-100'
                                            : 'text-blue-500 hover:text-blue-700 hover:bg-blue-100'
                                        }`}
                                        title={editableRows.has(entry.id) ? "บันทึก" : "แก้ไข"}
                                      >
                                        {editableRows.has(entry.id) ? (
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        ) : (
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                          </svg>
                                        )}
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => handleDeleteEntry(entry.id)} 
                                      className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100" 
                                      title="ลบ" 
                                    >
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                      </svg>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex justify-between items-center">
                <button 
                  type="button" 
                  onClick={handleAddRow} 
                  className="bg-orange-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-orange-600 text-sm" 
                  disabled={isReadOnly}
                >
                  Add Row
                </button>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={handleShowHistory} 
                    className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-600 text-sm"
                  >
                    ดูประวัติการลงข้อมูล
                  </button>
                  <button 
                    type="button" 
                    onClick={handleSubmit} 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-2 px-6 rounded-md hover:from-blue-700 hover:to-purple-700" 
                    disabled={isReadOnly || isFutureDate}
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        groupedLogs={historyLogsGrouped}
        allProjects={allProjects}
      />
      <RecheckPopup 
        isOpen={isRecheckOpen}
        onClose={() => setIsRecheckOpen(false)}
        onConfirm={handleConfirmSubmit}
        dailyReportEntries={entriesToSubmit}
        workDate={workDate}
      />
    </PageLayout>
  );
}