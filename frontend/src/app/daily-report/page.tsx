'use client';

import { useState, useEffect, useCallback, useId, useMemo } from 'react';
import Calendar from 'react-calendar';
import '../custom-calendar.css';
import { getEmployeeByID } from '@/services/employeeService';
import { getEmployeeDailyReportEntries, fetchAvailableSubtasksForEmployee } from '@/services/taskAssignService';
import PageLayout from '@/components/shared/PageLayout';
import { useAuth } from '@/context/AuthContext';
import { DailyReportEntry, Subtask } from '@/types/database';
import { getProjects, Project } from '@/lib/projects';
import { SubtaskAutocomplete } from '@/components/SubtaskAutocomplete'; // <-- IMPORT aUTOCPMPLETE

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

const createInitialEmptyDailyReportEntry = (employeeId: string, assignDate: string, baseId: string, index: number): DailyReportEntry => ({
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

  const [dailyReportEntries, setDailyReportEntries] = useState<DailyReportEntry[]>([]);
  const [touchedRows, setTouchedRows] = useState<Set<string>>(new Set());
  const [availableSubtasks, setAvailableSubtasks] = useState<Subtask[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);

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
    setTouchedRows(new Set());
    try {
      const [employee, dailyEntries, projects, subtasks] = await Promise.all([
        getEmployeeByID(employeeId),
        getEmployeeDailyReportEntries(employeeId),
        getProjects(),
        fetchAvailableSubtasksForEmployee(employeeId),
      ]);
      
      setAllProjects(projects);
      setAvailableSubtasks(subtasks);

      if (employee) {
        setEmployeeData(employee);
        const entriesForDate = dailyEntries.filter(entry => entry.assignDate === workDate);
        setDailyReportEntries(entriesForDate.length > 0 ? entriesForDate : [createInitialEmptyDailyReportEntry(employeeId, workDate, baseId, 0)]);
      } else {
        setError('ไม่พบข้อมูลพนักงาน');
        setEmployeeData(null);
        setDailyReportEntries([createInitialEmptyDailyReportEntry(employeeId, workDate, baseId, 0)]);
      }
    } catch (err) { console.error(err); setError('เกิดข้อผิดพลาด'); } 
    finally { setLoading(false); }
  }, [employeeId, workDate, baseId]);

  useEffect(() => { if (appUser?.employeeId) setEmployeeId(appUser.employeeId); }, [appUser]);
  useEffect(() => { fetchAllData(); }, [fetchAllData]);
  useEffect(() => { if (date instanceof Date) setWorkDate(date.toISOString().split('T')[0]); }, [date]);

  const handleUpdateEntry = (entryId: string, updates: Partial<DailyReportEntry>) => {
    setDailyReportEntries(entries => entries.map(entry => (entry.id === entryId ? { ...entry, ...updates } : entry)));
  };

  const handleRowFocus = (entryId: string, idx: number) => {
    if (!touchedRows.has(entryId)) {
      setTouchedRows(prev => new Set(prev).add(entryId));
      if (idx === dailyReportEntries.length - 1) {
        handleAddRow();
      }
    }
  };

  const handleTimeChange = (entryId: string, type: 'normalWorkingHours' | 'otWorkingHours', part: 'h' | 'm', value: string) => {
    const currentEntry = dailyReportEntries.find(e => e.id === entryId);
    if (!currentEntry) return;
    const currentTime = currentEntry[type] || '0:0';
    let [h, m] = currentTime.split(':').map(Number);
    if (part === 'h') h = Number(value);
    if (part === 'm') m = Number(value);
    handleUpdateEntry(entryId, { [type]: `${h}:${m}` });
  };

  const handleDeleteEntry = (entryId: string) => {
    if (dailyReportEntries.length <= 1) return alert('ต้องมีอย่างน้อย 1 แถว');
    if (window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
      setDailyReportEntries(entries => entries.filter(entry => entry.id !== entryId));
    }
  };
  
  const handleAddRow = () => {
    setDailyReportEntries(prev => [...prev, createInitialEmptyDailyReportEntry(employeeId, workDate, baseId, prev.length)]);
  };

  const handleRelateDrawingChange = (entryId: string, subtaskId: string | null) => {
    const selectedSubtask = subtaskId ? availableSubtasks.find(sub => sub.id === subtaskId) : null;
    const updates = selectedSubtask ? {
      subtaskId: selectedSubtask.id,
      subTaskName: selectedSubtask.subTaskName, subTaskCategory: selectedSubtask.subTaskCategory,
      progress: `${selectedSubtask.subTaskProgress || 0}%`, note: selectedSubtask.remark,
      internalRev: selectedSubtask.internalRev, subTaskScale: selectedSubtask.subTaskScale,
      project: selectedSubtask.project, taskName: selectedSubtask.taskName, item: selectedSubtask.item,
    } : { subtaskId: '', subTaskName: '', progress: '0%', note: '', item: '', status: 'pending' }; // Reset fields
    handleUpdateEntry(entryId, updates);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting data:", dailyReportEntries);
    alert("Submit button clicked! Check the console for data.");
  };

  return (
    <PageLayout>
      <div className="container-fluid mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-1/3 lg:w-1/4 max-w-sm">
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
                <Calendar onChange={setDate} value={date} className="custom-calendar" locale="th-TH" />
            </div>
            <div className="mt-4 p-4 bg-white rounded-lg shadow-md border border-gray-200 text-xs text-gray-700 space-y-2">
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div><span>วันที่ปัจจุบัน</span></div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-yellow-300 mr-2"></div><span>วันที่มีการลงข้อมูลแล้ว</span></div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-gray-300 mr-2"></div><span>วันที่สามารถลงข้อมูลย้อนหลังได้</span></div>
            </div>
          </div>

          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 items-end">
                  <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">รหัสพนักงาน</label>
                      <div className="flex">
                          <input type="text" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-l-md text-sm text-gray-900 focus:ring-orange-500 focus:border-orange-500" placeholder="XXXXXX"/>
                          <button type="button" onClick={fetchAllData} disabled={loading} className="p-2 bg-orange-500 text-white rounded-r-md hover:bg-orange-600 font-semibold text-sm disabled:bg-orange-300">{loading ? '...' : 'ค้นหา'}</button>
                      </div>
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">วันที่ทำงาน</label>
                      <input type="date" value={workDate} readOnly className="w-full p-2 border border-gray-300 rounded-md text-sm bg-gray-100 text-gray-900 cursor-not-allowed"/>
                  </div>
              </div>

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
                    {dailyReportEntries.map((entry, index) => {
                      // Options available for this specific row
                      const availableOptions = availableSubtasks.filter(subtask => 
                        !selectedSubtaskIds.has(subtask.id) || subtask.id === entry.subtaskId
                      );
                      const [normalH, normalM] = (entry.normalWorkingHours || '0:0').split(':');
                      const [otH, otM] = (entry.otWorkingHours || '0:0').split(':');

                      return (
                        <tr key={entry.id} className="bg-yellow-50 border-b border-yellow-200">
                          <td className="p-2 border-r border-yellow-200 text-center text-gray-800">{index + 1}</td>
                          <td className="p-2 border-r border-yellow-200">
                             <SubtaskAutocomplete
                                entryId={entry.id}
                                value={entry.subtaskId}
                                options={availableOptions}
                                allProjects={allProjects}
                                onChange={handleRelateDrawingChange}
                                onFocus={() => handleRowFocus(entry.id, index)}
                              />
                          </td>
                          <td className="p-2 border-r border-yellow-200">
                            <div className="flex items-center gap-1">
                                <select value={normalH} onFocus={() => handleRowFocus(entry.id, index)} onChange={e => handleTimeChange(entry.id, 'normalWorkingHours', 'h', e.target.value)} className="w-full p-1 border border-gray-300 rounded-md text-xs text-gray-900">{hourOptions.map(h => <option key={h} value={h}>{h} ชั่วโมง</option>)}</select>
                                <select value={normalM} onFocus={() => handleRowFocus(entry.id, index)} onChange={e => handleTimeChange(entry.id, 'normalWorkingHours', 'm', e.target.value)} className="w-full p-1 border border-gray-300 rounded-md text-xs text-gray-900">{minuteOptions.map(m => <option key={m} value={m}>{m} นาที</option>)}</select>
                            </div>
                          </td>
                           <td className="p-2 border-r border-yellow-200">
                            <div className="flex items-center gap-1">
                                <select value={otH} onFocus={() => handleRowFocus(entry.id, index)} onChange={e => handleTimeChange(entry.id, 'otWorkingHours', 'h', e.target.value)} className="w-full p-1 border border-gray-300 rounded-md text-xs text-gray-900">{hourOptions.map(h => <option key={h} value={h}>{h} ชั่วโมง</option>)}</select>
                                <select value={otM} onFocus={() => handleRowFocus(entry.id, index)} onChange={e => handleTimeChange(entry.id, 'otWorkingHours', 'm', e.target.value)} className="w-full p-1 border border-gray-300 rounded-md text-xs text-gray-900">{minuteOptions.map(m => <option key={m} value={m}>{m} นาที</option>)}</select>
                            </div>
                          </td>
                          <td className="p-2 border-r border-yellow-200">
                            <div className="flex items-center gap-1">
                              <select value={entry.status} onFocus={() => handleRowFocus(entry.id, index)} onChange={(e) => handleUpdateEntry(entry.id, { status: e.target.value as DailyReportEntry['status'] })} className="w-full p-1 border border-gray-300 rounded-md bg-yellow-100 text-xs text-gray-900">
                                <option value="pending">รอดำเนินการ</option>
                                <option value="in-progress">กำลังดำเนินการ</option>
                                <option value="completed">เสร็จสมบูรณ์</option>
                              </select>
                              <input type="number" min="0" max="100" value={parseInt(entry.progress) || 0} onFocus={() => handleRowFocus(entry.id, index)} onChange={(e) => handleUpdateEntry(entry.id, { progress: `${e.target.value}%` })} className="w-14 p-1 border border-gray-300 rounded-md text-center text-xs text-gray-900"/>
                              <span className="text-gray-800">%</span>
                            </div>
                          </td>
                          <td className="p-2 border-r border-yellow-200"><input type="text" value={entry.note || ''} onFocus={() => handleRowFocus(entry.id, index)} onChange={(e) => handleUpdateEntry(entry.id, { note: e.target.value })} className="w-full p-1 border border-gray-300 rounded-md text-xs text-gray-900" placeholder="เพิ่มหมายเหตุ"/></td>
                          <td className="p-2 border-r border-yellow-200 text-center text-gray-500">Progress<br/>ต้องถึง 100%</td>
                          <td className="p-2 text-center">
                            <button onClick={() => handleDeleteEntry(entry.id)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100" title="ลบ">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-between items-center">
                  <button type="button" onClick={handleAddRow} className="bg-orange-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-orange-600 text-sm">Add Row</button>
                  <button type="submit" onClick={handleSubmit} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-2 px-6 rounded-md hover:from-blue-700 hover:to-purple-700">Submit</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
