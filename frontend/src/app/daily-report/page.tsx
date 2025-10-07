
'use client';

import { useState, useEffect, useCallback, useId, useMemo, useRef } from 'react';
import Calendar from 'react-calendar';
import '../custom-calendar.css';
import { getEmployeeByID } from '@/services/employeeService';
import { getEmployeeDailyReportEntries, fetchAvailableSubtasksForEmployee, saveDailyReportEntries } from '@/services/taskAssignService';
import PageLayout from '@/components/shared/PageLayout';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/context/DashboardContext';
import { DailyReportEntry, Subtask, Project } from '@/types/database';
import { getProjects } from '@/lib/projects';
import { SubtaskAutocomplete } from '@/components/SubtaskAutocomplete';
import Select from '@/components/ui/Select';
import { RecheckPopup } from '@/components/RecheckPopup';
import isEqual from 'lodash.isequal';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

const createInitialEmptyDailyReportEntry = (employeeId: string, assignDate: string, baseId: string, index: number): DailyReportEntry => ({
  id: `${baseId}-temp-${index}`,
  employeeId, assignDate, subtaskId: '', subtaskPath: '', // Added subtaskPath
  normalWorkingHours: '0:0', otWorkingHours: '0:0', progress: '0%',
  note: '', status: 'pending', subTaskName: '', subTaskCategory: '', internalRev: '',
  subTaskScale: '', project: '', taskName: '', remark: '', item: '', relateDrawing: '',
});

const hourOptions = Array.from({ length: 13 }, (_, i) => ({ value: i.toString(), label: `${i} ชั่วโมง` }));
const minuteOptions = [0, 15, 30, 45].map(m => ({ value: m.toString(), label: `${m} นาที` }));

const generateRelateDrawingText = (subtask: Subtask, project?: Project | null): string => {
  if (!subtask) return '';
  let parts = [];
  if (project) parts.push(project.abbr);
  if (subtask.taskName) parts.push(subtask.taskName);
  if (subtask.subTaskName) parts.push(subtask.subTaskName);
  if (subtask.item) parts.push(subtask.item);
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

  const [reportDataCache, setReportDataCache] = useState<Record<string, DailyReportEntry[]>>({});
  const [allDailyEntries, setAllDailyEntries] = useState<DailyReportEntry[]>([]);
  const [dailyReportEntries, setDailyReportEntries] = useState<DailyReportEntry[]>([]);

  const [touchedRows, setTouchedRows] = useState<Set<string>>(new Set());
  const [availableSubtasks, setAvailableSubtasks] = useState<Subtask[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const prevWorkDateRef = useRef<string>(workDate);

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
      const [employee, dailyEntries, projects, subtasks] = await Promise.all([
        getEmployeeByID(eid),
        getEmployeeDailyReportEntries(eid), // This fetches from the old location, which might be fine for now or needs changing
        getProjects(),
        fetchAvailableSubtasksForEmployee(eid),
      ]);
      
      setAllProjects(projects);
      setAvailableSubtasks(subtasks);
      
      const processedDailyEntries = dailyEntries.map(entry => {
        const subtask = subtasks.find(s => s.id === entry.subtaskId);
        const project = subtask ? projects.find(p => p.id === subtask.project) : null;
        return {
          ...entry,
          subtaskPath: subtask?.path || '', // Make sure path is included
          relateDrawing: subtask ? generateRelateDrawingText(subtask, project) : '',
        };
      });

      setAllDailyEntries(processedDailyEntries);

      if (employee) setEmployeeData(employee);
      else {
        setError('ไม่พบข้อมูลพนักงาน');
        setEmployeeData(null);
      }
    } catch (err) {
      console.error('Error fetching daily report entries:', err);
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
      const twoDaysAgoLocal = new Date(todayLocal);
      twoDaysAgoLocal.setDate(todayLocal.getDate() - 2);

      setIsReadOnly(selectedDateLocal < twoDaysAgoLocal);

      const year = selectedDateLocal.getFullYear();
      const month = String(selectedDateLocal.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDateLocal.getDate()).padStart(2, '0');
      setWorkDate(`${year}-${month}-${day}`);
    }
  }, [date]);

  useEffect(() => {
    if (!employeeId || !workDate) return;

    const previousDate = prevWorkDateRef.current;
    if (previousDate && previousDate !== workDate) {
      setReportDataCache(prevCache => ({
        ...prevCache,
        [previousDate]: dailyReportEntries,
      }));
    }

    if (reportDataCache[workDate]) {
      setDailyReportEntries(reportDataCache[workDate]);
    } else {
      const entriesFromBackend = allDailyEntries.filter(entry => entry.assignDate === workDate);
      const entriesToShow = entriesFromBackend.length > 0
        ? entriesFromBackend
        : [createInitialEmptyDailyReportEntry(employeeId, workDate, baseId, 0)];
      setDailyReportEntries(entriesToShow);
      setReportDataCache(prevCache => ({ ...prevCache, [workDate]: entriesToShow }));
    }

    prevWorkDateRef.current = workDate;
    setTouchedRows(new Set());
  }, [workDate, employeeId, allDailyEntries, baseId]);

  const handleUpdateEntry = (entryId: string, updates: Partial<DailyReportEntry>) => {
    setDailyReportEntries(currentEntries => {
      const newEntries = currentEntries.map(entry => {
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
      setReportDataCache(prevCache => ({ ...prevCache, [workDate]: newEntries }));
      return newEntries;
    });
  };

  const handleRowFocus = (entryId: string, idx: number) => {
    if (!touchedRows.has(entryId)) {
      setTouchedRows(prev => new Set(prev).add(entryId));
      if (idx === dailyReportEntries.length - 1) handleAddRow();
    }
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
    if (dailyReportEntries.length <= 1) {
      alert('ต้องมีอย่างน้อย 1 แถว');
      return;
    }
    if (window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
      setDailyReportEntries(currentEntries => {
        const newEntries = currentEntries.filter(entry => entry.id !== entryId);
        setReportDataCache(prevCache => ({ ...prevCache, [workDate]: newEntries }));
        return newEntries;
      });
    }
  };
  
  const handleAddRow = () => {
    setDailyReportEntries(currentEntries => {
      const newEntries = [...currentEntries, createInitialEmptyDailyReportEntry(employeeId, workDate, baseId, currentEntries.length)];
      setReportDataCache(prevCache => ({ ...prevCache, [workDate]: newEntries }));
      return newEntries;
    });
  };

  const handleRelateDrawingChange = (entryId: string, subtaskId: string | null) => {
    const selectedSubtask = subtaskId ? availableSubtasks.find(sub => sub.id === subtaskId) : null;
    const project = selectedSubtask ? allProjects.find(p => p.id === selectedSubtask.project) : null;

    const updates = selectedSubtask ? {
        subtaskId: selectedSubtask.id,
        subtaskPath: selectedSubtask.path || '', // <-- CRITICAL: Store the subtask path
        subTaskName: selectedSubtask.subTaskName,
        subTaskCategory: selectedSubtask.subTaskCategory,
        progress: `${selectedSubtask.subTaskProgress || 0}%`,
        note: selectedSubtask.remark,
        internalRev: selectedSubtask.internalRev,
        subTaskScale: selectedSubtask.subTaskScale,
        project: selectedSubtask.project,
        taskName: selectedSubtask.taskName,
        item: selectedSubtask.item,
        status: 'pending',
        relateDrawing: generateRelateDrawingText(selectedSubtask, project),
    } : { 
        subtaskId: '', subtaskPath: '', progress: '0%', note: '', item: '', status: 'pending', relateDrawing: '' 
    };
    handleUpdateEntry(entryId, updates);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setError('ไม่พบรหัสพนักงาน ไม่สามารถบันทึกได้');
      return;
    }
    setIsRecheckOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setIsRecheckOpen(false);
    setLoading(true);
    setError('');
    try {
      await saveDailyReportEntries(employeeId, dailyReportEntries);
      alert('บันทึกข้อมูล Daily Report สำเร็จ!');
      setHasUnsavedChanges(false);
      
      setReportDataCache(prevCache => {
        const newCache = { ...prevCache };
        delete newCache[workDate];
        return newCache;
      });

      await fetchAllData(employeeId);

    } catch (err) {
      console.error('Error submitting daily report:', err);
      setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล Daily Report');
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล Daily Report');
    } finally {
      setLoading(false);
    }
  };
  
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const hasData = allDailyEntries.some(entry => {
        const entryDate = new Date(entry.assignDate);
        return new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate()).getTime() === normalizedDate;
      });
      if (hasData) return 'tile-has-data';

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);

      if (date < today && date >= twoDaysAgo) return 'tile-can-edit-past';
    }
    return '';
  };

  return (
    <PageLayout>
      <div className="container-fluid mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-[384px] md:flex-shrink-0">
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
                <Calendar 
                  onChange={setDate} 
                  value={date} 
                  className="custom-calendar" 
                  locale="th-TH" 
                  tileClassName={tileClassName}
                />
            </div>
            <div className="mt-4 p-4 bg-white rounded-lg shadow-md border border-gray-200 text-xs text-gray-700 space-y-2">
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div><span>วันที่ปัจจุบัน</span></div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-yellow-300 mr-2"></div><span>วันที่มีการลงข้อมูลแล้ว</span></div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-gray-300 mr-2"></div><span>วันที่สามารถลงข้อมูลย้อนหลังได้</span></div>
            </div>
          </div>

          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 min-h-[80vh]">
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

              {loading && <p>Loading...</p>}
              {error && <p className="mb-4 text-red-500 text-sm">{error}</p>}
              {employeeData && <p className="mb-4 text-sm font-semibold text-gray-800">ชื่อ-นามสกุล: {employeeData.fullName}</p>}

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-orange-500 text-white">
                      <th className="p-2 font-semibold text-left w-10">No</th>
                      <th className="p-2 font-semibold text-left w-1/3">Relate Drawing</th>
                      <th className="p-2 font-semibold text-left">เวลาทำงาน / Working Hours</th>
                      <th className="p-2 font-semibold text-left">เวลาโอที / Overtime</th>
                      <th className="p-2 font-semibold text-left">Progress</th>
                      <th className="p-2 font-semibold text-left">Note</th>
                      <th className="p-2 font-semibold text-left">Upload File</th>
                      <th className="p-2 font-semibold text-center w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyReportEntries.map((entry, index) => (
                        <tr key={entry.id} className="bg-yellow-50 border-b border-yellow-200">
                          <td className="p-2 border-r border-yellow-200 text-center text-gray-800">{index + 1}</td>
                          <td className="p-2 border-r border-yellow-200">
                             <SubtaskAutocomplete
                                entryId={entry.id}
                                value={entry.subtaskId}
                                options={availableSubtasks}
                                allProjects={allProjects}
                                onChange={handleRelateDrawingChange}
                                onFocus={() => handleRowFocus(entry.id, index)}
                                disabled={isReadOnly}
                              />
                          </td>
                          <td className="p-2 border-r border-yellow-200">
                            <div className="flex items-center gap-1">
                                <Select 
                                  value={String((entry.normalWorkingHours || '0:0').split(':')[0])} 
                                  onChange={value => handleTimeChange(entry.id, 'normalWorkingHours', 'h', value)} 
                                  options={hourOptions} 
                                  disabled={isReadOnly} 
                                />
                                <Select 
                                  value={String((entry.normalWorkingHours || '0:0').split(':')[1])} 
                                  onChange={value => handleTimeChange(entry.id, 'normalWorkingHours', 'm', value)} 
                                  options={minuteOptions} 
                                  disabled={isReadOnly} 
                                />
                            </div>
                          </td>
                           <td className="p-2 border-r border-yellow-200">
                            <div className="flex items-center gap-1">
                                <Select 
                                  value={String((entry.otWorkingHours || '0:0').split(':')[0])} 
                                  onChange={value => handleTimeChange(entry.id, 'otWorkingHours', 'h', value)} 
                                  options={hourOptions} 
                                  disabled={isReadOnly}
                                />
                                <Select 
                                  value={String((entry.otWorkingHours || '0:0').split(':')[1])} 
                                  onChange={value => handleTimeChange(entry.id, 'otWorkingHours', 'm', value)} 
                                  options={minuteOptions} 
                                  disabled={isReadOnly}
                                />
                            </div>
                          </td>
                          <td className="p-2 border-r border-yellow-200">
                            <div className="flex items-center gap-1">
                              <input type="number" min="0" max="100" value={parseInt(entry.progress, 10) || 0} onChange={(e) => handleUpdateEntry(entry.id, { progress: `${e.target.value}%` })} className="w-14 p-1 border border-gray-300 rounded-md text-center text-xs text-gray-900" disabled={isReadOnly}/>
                              <span className="text-gray-800">%</span>
                            </div>
                          </td>
                          <td className="p-2 border-r border-yellow-200"><input type="text" value={entry.note || ''} onChange={(e) => handleUpdateEntry(entry.id, { note: e.target.value })} className="w-full p-1 border border-gray-300 rounded-md text-xs text-gray-900" placeholder="เพิ่มหมายเหตุ" disabled={isReadOnly}/></td>
                          <td className="p-2 border-r border-yellow-200 text-center text-gray-500">Progress<br/>ต้องถึง 100%</td>
                          <td className="p-2 text-center">
                            <button onClick={() => handleDeleteEntry(entry.id)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100" title="ลบ" disabled={isReadOnly}>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-between items-center">
                  <button type="button" onClick={handleAddRow} className="bg-orange-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-orange-600 text-sm" disabled={isReadOnly}>Add Row</button>
                  <button type="button" onClick={handleSubmit} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-2 px-6 rounded-md hover:from-blue-700 hover:to-purple-700" disabled={isReadOnly}>Submit</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <RecheckPopup 
        isOpen={isRecheckOpen}
        onClose={() => setIsRecheckOpen(false)}
        onConfirm={handleConfirmSubmit}
        dailyReportEntries={dailyReportEntries}
        workDate={workDate}
      />
    </PageLayout>
  );
}
