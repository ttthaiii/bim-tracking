'use client';

import { useState, useEffect, useCallback, useId, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import Calendar with no SSR
const Calendar = dynamic(
  () => import('react-calendar'),
  { ssr: false } // This ensures the component only renders on client-side
);
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

/**
 * แปลง Date เป็น string ในรูปแบบ YYYY-MM-DD โดยไม่มีปัญหา timezone
 */
const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

// Calculate total working hours excluding a specific entry
const calculateTotalHoursExcluding = (entries: DailyReportEntry[], excludeEntryId: string): number => {
  return entries.reduce((total, entry) => {
    if (entry.id === excludeEntryId) return total;
    const [hours, minutes] = (entry.normalWorkingHours || '0:0').split(':').map(Number);
    return total + hours + minutes / 60;
  }, 0);
};

// Generate hour options based on available hours
const getHourOptions = (entries: DailyReportEntry[], currentEntryId: string): { value: string; label: string; }[] => {
  const totalOtherHours = calculateTotalHoursExcluding(entries, currentEntryId);
  const maxAvailableHours = Math.floor(8 - totalOtherHours);
  const options = Array.from(
    { length: maxAvailableHours + 1 },
    (_, i) => ({ value: i.toString(), label: `${i} ชม.` })
  );
  
  return options;
};

// สร้างตัวเลือกนาทีตามเวลาที่เหลือ
const getMinuteOptions = (entries: DailyReportEntry[], currentEntryId: string, currentHours: number): { value: string; label: string; }[] => {
  const totalOtherHours = calculateTotalHoursExcluding(entries, currentEntryId);
  const remainingHours = 8 - (totalOtherHours + currentHours);
  
  // ถ้าเหลือเวลาน้อยกว่า 1 ชั่วโมง ให้แสดงตัวเลือกนาทีตามที่เหลือ
  if (remainingHours < 0) {
    return [{ value: '0', label: '0 น. (เกินเวลา)' }];
  } else if (remainingHours === 0) {
    return [{ value: '0', label: '0 น. (ครบ 8 ชม.)' }];
  } else if (remainingHours < 1) {
    const maxMinutes = Math.floor(remainingHours * 60);
    return [0, 15, 30, 45]
      .filter(m => m <= maxMinutes)
      .map(m => ({ 
        value: m.toString(), 
        label: `${m} น. (เหลือ ${maxMinutes} น.)`
      }));
  }
  
  // ถ้าเหลือเวลามากกว่า 1 ชั่วโมง แสดงตัวเลือกนาทีทั้งหมด
  const remainingMinutes = Math.floor(remainingHours * 60);
  return [0, 15, 30, 45].map(m => ({ 
    value: m.toString(), 
    label: `${m} น. (เหลือ ${remainingMinutes - m} น.)`
  }));
};

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
  const [date, setDate] = useState<Value>(null);
  // เก็บ workDate ในรูปแบบ YYYY-MM-DD โดยตรง
  const [workDate, setWorkDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [employeeId, setEmployeeId] = useState('');
  const [employeeData, setEmployeeData] = useState<{ employeeId: string; fullName: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isRecheckOpen, setIsRecheckOpen] = useState(false);
  const [isFutureDate, setIsFutureDate] = useState(false);
  
  const [tempDataCache, setTempDataCache] = useState<Record<string, DailyReportEntry[]>>({});
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
    // กรองข้อมูลสำหรับประวัติ: ใช้ assignDate เป็นหลัก
    const entriesForDate = allDailyEntries.filter(entry => {
      const matches = entry.assignDate === workDate;
      return matches;
    });

    console.log('Found entries for history:', {
      workDate,
      entriesCount: entriesForDate.length,
      entries: entriesForDate
    });

    const groupedLogs: Record<string, DailyReportEntry[]> = {};

    entriesForDate.forEach(entry => {
      // จัดกลุ่มตาม timestamp สำหรับการเรียงลำดับการส่งข้อมูล
      // ใช้ timestamp เป็นหลักในการจัดกลุ่ม เพราะแต่ละครั้งที่บันทึกจะมี timestamp ไม่เหมือนกัน
      const groupingTime = entry.timestamp;
      
      const timestampKey = groupingTime?.toMillis() 
        ? String(Math.floor(groupingTime.toMillis() / 1000) * 1000) 
        : 'no-timestamp';
      
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
    const currentData = tempDataCache[workDate];
    
    const normalize = (entries: DailyReportEntry[] = []) => 
      entries.map(({ id, relateDrawing, ...rest }) => ({ ...rest, id: id.startsWith('temp-') ? '' : id }));

    if (originalData.length === 0 && currentData && currentData.some((d: DailyReportEntry) => d.subtaskId)) {
        setHasUnsavedChanges(true);
    } else {
        setHasUnsavedChanges(!isEqual(normalize(originalData), normalize(currentData)));
    }
  }, [workDate, allDailyEntries, setHasUnsavedChanges, tempDataCache]);

  const fetchAllData = useCallback(async (eid: string) => {
    setLoading(true);
    setError('');
    try {
      console.log('Fetching data for employee:', eid);
      const [employee, dailyEntries, projects, subtasks, files] = await Promise.all([
        getEmployeeByID(eid),
        getEmployeeDailyReportEntries(eid),
        getProjects(),
        fetchAvailableSubtasksForEmployee(eid),
        getUploadedFilesForEmployee(eid),
      ]);
      
      console.log('Daily entries from API:', dailyEntries);
      
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

  // Set initial date after component mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && !date) {
      setDate(new Date());
    }
  }, [date]);

  useEffect(() => {
    if (date instanceof Date) {
      // แปลงวันที่เป็น string โดยตรง
      const selectedDate = formatDateToYYYYMMDD(date);
      console.log('🔍 Selected date:', {
        original: date.toISOString(),
        formatted: selectedDate
      });
      setWorkDate(selectedDate);

      // เปรียบเทียบวันที่ด้วย string
      const today = formatDateToYYYYMMDD(new Date());
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoStr = formatDateToYYYYMMDD(twoDaysAgo);

      console.log('🔍 Date comparisons:', {
        selectedDate,
        today,
        twoDaysAgo: twoDaysAgoStr
      });

      setIsFutureDate(selectedDate > today);
      setIsReadOnly(selectedDate < twoDaysAgoStr);
    }
  }, [date]);

  // Effect สำหรับจัดการ cache และ validate workDate เมื่อมีการเปลี่ยนวันที่
  useEffect(() => {
    // Validate workDate format
    if (workDate) {
      console.log('Validating workDate:', workDate);
      // ตรวจสอบว่า workDate เป็น YYYY-MM-DD format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(workDate)) {
        console.error('Invalid workDate format:', workDate);
        // ถ้าไม่ใช่ format ที่ถูกต้อง ให้แปลงใหม่
        const date = new Date(workDate);
        if (!isNaN(date.getTime())) {
          const correctedDate = formatDateToYYYYMMDD(date);
          console.log('Correcting workDate to:', correctedDate);
          setWorkDate(correctedDate);
          return;
        }
      }
    }

    if (!dailyReportEntries.length) return;
    
    // บันทึกข้อมูลลง cache เมื่อมีการเปลี่ยนวันที่
    setTempDataCache(prev => ({
      ...prev,
      [workDate]: dailyReportEntries
    }));
    
    prevWorkDateRef.current = workDate;
  }, [workDate, dailyReportEntries]);

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

    // Effect สำหรับโหลดข้อมูลจาก allDailyEntries หรือ cache เมื่อเปลี่ยนวันที่
  useEffect(() => {
    console.log('Loading data for date:', workDate);

    if (!employeeId || !workDate) {
      console.log('Missing required data, skipping');
      return;
    }

    // ถ้ามีข้อมูลใน cache ใช้ข้อมูลจาก cache
    if (tempDataCache[workDate]) {
      console.log('🔍 Using cached data:', {
        workDate,
        cachedEntries: tempDataCache[workDate],
        cacheKeys: Object.keys(tempDataCache)
      });
      setDailyReportEntries(tempDataCache[workDate]);
      return;
    }

    // ถ้าไม่มีข้อมูลใน cache และไม่มีข้อมูลใน allDailyEntries
    if (!allDailyEntries.length) {
      console.log('🔍 No entries state:', {
        workDate,
        allEntriesLength: allDailyEntries.length,
        cache: tempDataCache
      });
      return;
    }

    console.log('Filtering entries for table display:', workDate);
    // กรองข้อมูลโดยใช้ assignDate เป็นหลัก
    const entriesForDate = allDailyEntries.filter(entry => {
      const matches = entry.assignDate === workDate;
      if (matches) {
        console.log('Found matching entry for table:', entry);
      }
      return matches;
    });

    if (entriesForDate.length === 0) {
        const initialEntry = createInitialEmptyDailyReportEntry(employeeId, workDate, baseId, 0);
        const newEntry = {
            ...initialEntry,
            isExistingData: false,
            timestamp: Timestamp.now()
        };
        setDailyReportEntries([newEntry]);
        setTempDataCache(prev => ({ ...prev, [workDate]: [newEntry] }));
        setEditableRows(new Set()); // เคลียร์ editableRows เพราะเป็นข้อมูลใหม่ แก้ไขได้เลย
        return;
    }

    // หา timestamp ล่าสุดของวันนั้น (ข้อมูลที่บันทึกล่าสุดตาม timestamp)
    const latestTimestamp = Math.max(...entriesForDate.map(entry => entry.timestamp?.toMillis() || 0));
    console.log('Latest timestamp for date:', new Date(latestTimestamp));

    // กรองเฉพาะ entries ที่มี timestamp ตรงกับ timestamp ล่าสุด
    const latestEntries = entriesForDate.filter(entry => 
      Math.floor((entry.timestamp?.toMillis() || 0) / 1000) === Math.floor(latestTimestamp / 1000)
    );
    console.log('Latest entries:', latestEntries);

    const latestEntriesMap: Record<string, DailyReportEntry> = {};
    latestEntries.forEach((entry: DailyReportEntry) => {
      if (!entry.subtaskId) return;
      latestEntriesMap[entry.subtaskId] = entry;
    });

  const entriesToShow = Object.values(latestEntriesMap).map((entry: DailyReportEntry) => {
      // ตรวจสอบว่าเป็นงานลาหรือไม่ จาก subtask ที่เกี่ยวข้อง
      const subtask = availableSubtasks.find(sub => sub.id === entry.subtaskId);
      const isLeaveTask = subtask ?
        (subtask.taskName?.includes('ลา') || subtask.subTaskName?.includes('ลา')) :
        (entry.taskName?.includes('ลา') || entry.subTaskName?.includes('ลา'));

      // สร้าง relateDrawing สำหรับข้อมูลเก่า
      let relateDrawing = entry.relateDrawing;
      if (!relateDrawing && subtask) {
        // ค้นหา project
        const project = allProjects.find(p => p.id === subtask.projectId) ||
                       allProjects.find(p => p.id === subtask.project) ||
                       allProjects.find(p => p.name === subtask.project);

        // สร้าง relateDrawing ในรูปแบบ: ตัวย่อโครงการ_TaskName_subTask_item
        const abbr = project?.abbr || subtask.project || 'N/A';
        const taskName = subtask.taskName || 'N/A';
        const subTaskName = subtask.subTaskName || 'N/A';
        const item = subtask.item || 'N/A';
        relateDrawing = `${abbr}_${taskName}_${subTaskName}_${item}`;
      }

      return {
        ...entry,
        isLeaveTask,
        initialProgress: isLeaveTask ? 0 : (parseInt(entry.progress.replace('%', ''), 10) || 0),
        progress: isLeaveTask ? '0%' : entry.progress,
        isExistingData: true, // เป็นข้อมูลเก่า (มี logTimestamp)
        relateDrawing: relateDrawing || '', // เพิ่ม relateDrawing
      };
    });

  console.log('entriesToShow', entriesToShow);
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
      // อัพเดท cache ด้วย
      setTempDataCache(prev => ({ ...prev, [workDate]: newEntries }));
      return newEntries;
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

    // For normal working hours, validate against 8-hour total limit
    if (type === 'normalWorkingHours') {
      const totalOtherHours = calculateTotalHoursExcluding(dailyReportEntries, entryId);
      const newTotalHours = totalOtherHours + h + m / 60;
      
      if (newTotalHours > 8) {
        // If exceeds 8 hours, adjust to maximum available
        const maxAvailableHours = Math.floor(8 - totalOtherHours);
        h = maxAvailableHours;
        m = 0;
      }
    }

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

  const handleRelateDrawingChange = (entryId: string, subtaskPath: string | null) => {
    const selectedSubtask = subtaskPath ? availableSubtasks.find(sub => sub.path === subtaskPath) : null;
    
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

    // สร้าง relateDrawing ในรูปแบบ: ตัวย่อโครงการ_TaskName_subTask_item
    const abbr = project?.abbr || selectedSubtask?.project || 'N/A';
    const taskName = selectedSubtask?.taskName || 'N/A';
    const subTaskName = selectedSubtask?.subTaskName || 'N/A';
    const item = selectedSubtask?.item || 'N/A';
    const relateDrawing = `${abbr}_${taskName}_${subTaskName}_${item}`;

    const updates: Partial<DailyReportEntry> = selectedSubtask ? {
        subtaskId: selectedSubtask.id,
        subtaskPath: selectedSubtask.path || '',
        subTaskName: selectedSubtask.subTaskName || 'N/A',
        subTaskCategory: selectedSubtask.subTaskCategory || '',
        progress: isLeave ? '0%' : `${newSubtaskInitialProgress}%`,
        note: selectedSubtask.remark || '',
        internalRev: selectedSubtask.internalRev || '',
        subTaskScale: selectedSubtask.subTaskScale || '',
        project: project ? project.id : (selectedSubtask.projectId || selectedSubtask.project || ''),
        taskName: selectedSubtask.taskName || 'N/A',
        item: selectedSubtask.item || '',
        relateDrawing: relateDrawing,
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

    // ตรวจสอบว่าวันที่ที่เลือกเป็นวันที่อนาคตหรือไม่
    const selectedDate = workDate;
    const today = formatDateToYYYYMMDD(new Date());
    
    console.log('Submitting data check:', {
      selectedDate,
      today,
      isFutureDate: selectedDate > today
    });

    if (selectedDate > today) {
      alert('ไม่สามารถลงข้อมูลล่วงหน้าได้');
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
      // หา progress เดิมจาก allDailyEntries (Progress ล่าสุดของ Subtask ในวันที่นี้)
      const existingEntry = allDailyEntries.find(e => 
        e.assignDate === selectedDate && 
        e.subtaskId === entry.subtaskId
      );
      const oldProgress = existingEntry?.progress || '0%';
      
      // ตรวจสอบว่า progress มี % หรือไม่
      const newProgress = entry.progress.includes('%') ? entry.progress : `${entry.progress}%`;
      
      // ใช้วันที่ที่เลือกจาก workDate
      return {
        ...entry,
        assignDate: selectedDate, // กำหนดวันที่ที่เลือกไว้
        relateDrawing: fullTaskName,
        progress: newProgress,
        oldProgress, // Progress ล่าสุดของ Subtask ในวันที่นี้ก่อนแก้ไข
      };
    });

    console.log('Entries to submit:', {
      workDate: selectedDate,
      entriesCount: entriesForRecheck.length,
      sampleDates: entriesForRecheck.map(e => e.assignDate)
    });

    setEntriesToSubmit(entriesForRecheck);
    setIsRecheckOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setIsRecheckOpen(false);
    setLoading(true);
    setError('');
    try {
      // ใช้วันที่จาก workDate โดยตรง (ที่ถูกตั้งค่าตอนเลือกวันที่)
      const selectedDate = workDate;
      
      // เช็คอีกครั้งว่าวันที่ถูกต้อง
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(selectedDate)) {
        throw new Error(`Invalid date format: ${selectedDate}`);
      }

      console.log('Confirming submission:', {
        selectedDate,
        entriesCount: entriesToSubmit.length
      });

      const entriesToSave = entriesToSubmit.map(entry => ({
        ...entry,
        assignDate: selectedDate, // ใช้วันที่ที่เลือกไว้
      }));

      console.log('Saving entries with date:', {
        workDate,
        entriesAssignDates: entriesToSave.map(e => e.assignDate)
      });

      await saveDailyReportEntries(employeeId, entriesToSave);
      
      alert('บันทึกข้อมูล Daily Report สำเร็จ!');
      setHasUnsavedChanges(false);
      
      // เคลียร์ cache และ flag ว่าเพิ่ง submit
      setTempDataCache({});
      prevWorkDateRef.current = workDate;
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
      
      // แปลงเป็น string YYYY-MM-DD โดยตรง
      const tileDate = formatDateToYYYYMMDD(date);
      const today = formatDateToYYYYMMDD(new Date());

      console.log('🔍 Tile date check:', {
        date: tileDate,
        today,
        comparison: tileDate < today
      });

      // Check if the day is Sunday (getDay() returns 0 for Sunday)
      const isSunday = date.getDay() === 0;

      if (tileDate < today) {
        const entriesForDate = allDailyEntries.filter(entry => entry.assignDate === tileDate);

        // Only add 'has-missing-data-marker' if it's not a Sunday and there are no entries
        if (entriesForDate.length === 0 && !isSunday) {
            classes.push('has-missing-data-marker');
        } else {
            const uniqueTimestamps = new Set(
                entriesForDate.map(e => Math.floor((e.timestamp?.toMillis() || 0) / 1000))
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
            <Calendar 
              onChange={setDate} 
              value={date || new Date()} 
              className="custom-calendar" 
              locale="th-TH"
              tileClassName={tileClassName}
              key={`calendar-${employeeId}`} 
            />
          </div>
            <div className="mt-4 p-4 bg-white rounded-lg shadow-md border border-gray-200 text-xs text-gray-700 space-y-2">
              <div className="flex items-center"><div className="w-3 h-3 rounded-sm bg-blue-500 mr-2"></div><span>วันที่เลือก</span></div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-sm bg-orange-500 mr-2"></div><span>วันที่ปัจจุบัน</span></div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span><span>วันที่ยังไม่มีการลงข้อมูล</span></div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></span><span>วันที่มีการแก้ไข</span></div>
            </div>
            {/* เพิ่มส่วนแสดงระยะเวลาทำงานคงเหลือ */}
            <div className="mt-4 p-4 bg-white rounded-lg shadow-md border border-gray-200">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-800 mb-2">ระยะเวลาทำงานคงเหลือ</span>
                {(() => {
                  const totalWorkingHours = dailyReportEntries.reduce((total, entry) => {
                    const [hours, minutes] = (entry.normalWorkingHours || '0:0').split(':').map(Number);
                    return total + hours + minutes / 60;
                  }, 0);
                  
                  const remainingHours = Math.max(0, 8 - totalWorkingHours);
                  const hours = Math.floor(remainingHours);
                  const minutes = Math.round((remainingHours - hours) * 60);
                  
                  // Format to HH:mm
                  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                  return <span className="text-2xl font-bold text-blue-600 text-center">{formattedTime}</span>;
                })()}
              </div>
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
                              {entry.subtaskId ? (
                                <div className="text-gray-800">
                                  {entry.relateDrawing}
                                  <button 
                                    onClick={() => handleUpdateEntry(entry.id, { subtaskId: '', relateDrawing: '' })}
                                    className="ml-2 text-red-500 hover:text-red-700"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : (
                                <SubtaskAutocomplete
                                  entryId={entry.id}
                                  value={entry.subtaskPath || null}
                                  options={filteredSubtasks}
                                  allProjects={allProjects}
                                  selectedSubtaskIds={new Set(dailyReportEntries
                                    .filter(e => e.id !== entry.id && e.subtaskPath) // ไม่รวม entry ปัจจุบัน
                                    .map(e => e.subtaskPath || '')
                                    .filter(path => path !== ''))} // รวบรวม subtaskPath ที่ถูกเลือกแล้ว และไม่เป็น empty string
                                  onChange={handleRelateDrawingChange}
                                  onFocus={() => handleRowFocus(entry.id, index)}
                                  isDisabled={isReadOnly && !isFutureDate}
                                />
                              )}
                            </td>
                            <td className="p-2 border-r border-yellow-200">
                              <div className="flex items-center space-x-1 w-28">
                                <Select 
                                  value={String((entry.normalWorkingHours || '0:0').split(':')[0])} 
                                  onChange={value => handleTimeChange(entry.id, 'normalWorkingHours', 'h', value)} 
                                  options={getHourOptions(dailyReportEntries, entry.id)} 
                                  disabled={isReadOnly || (entry.isExistingData && !editableRows.has(entry.id))}
                                  className="!w-12 !py-1 !px-1 text-center !text-xs"
                                />
                                <span className="text-gray-400">:</span>
                                <Select 
                                  value={String((entry.normalWorkingHours || '0:0').split(':')[1])} 
                                  onChange={value => handleTimeChange(entry.id, 'normalWorkingHours', 'm', value)} 
                                  options={getMinuteOptions(
                                    dailyReportEntries,
                                    entry.id,
                                    Number((entry.normalWorkingHours || '0:0').split(':')[0])
                                  )} 
                                  disabled={Boolean(isReadOnly || (entry.isExistingData && !editableRows.has(entry.id)))}
                                  className="!w-12 !py-1 !px-1 text-center !text-xs"
                                />
                              </div>
                            </td>
                            <td className="p-2 border-r border-yellow-200">
                              <div className="flex items-center space-x-1 w-28">
                                <Select 
                                  value={String((entry.otWorkingHours || '0:0').split(':')[0])} 
                                  onChange={value => handleTimeChange(entry.id, 'otWorkingHours', 'h', value)} 
                                  options={Array.from({ length: 13 }, (_, i) => ({ value: i.toString(), label: `${i} hrs` }))} 
                                  disabled={Boolean(isReadOnly || entry.isLeaveTask || (entry.isExistingData && !editableRows.has(entry.id)))}
                                  className="!w-12 !py-1 !px-1 text-center !text-xs"
                                />
                                <span className="text-gray-400">:</span>
                                <Select 
                                  value={String((entry.otWorkingHours || '0:0').split(':')[1])} 
                                  onChange={value => handleTimeChange(entry.id, 'otWorkingHours', 'm', value)} 
                                  options={[0, 15, 30, 45].map(m => ({ value: m.toString(), label: `${m} m` }))} 
                                  disabled={Boolean(isReadOnly || entry.isLeaveTask || (entry.isExistingData && !editableRows.has(entry.id)))}
                                  className="!w-12 !py-1 !px-1 text-center !text-xs"
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
                                    disabled={Boolean(isReadOnly || entry.isLeaveTask || isFutureDate || (entry.isExistingData && !editableRows.has(entry.id)))} 
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