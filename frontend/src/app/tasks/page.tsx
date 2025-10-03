'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Navbar from '@/components/shared/Navbar';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import Modal from '@/components/ui/Modal';
import RelateWorkSelect from './components/RelateWorkSelect';
import AssigneeSelect from './components/AssigneeSelect';
import { useFirestoreCache } from '@/contexts/FirestoreCacheContext';
import { getCachedProjects, getCachedTasks, getCachedSubtasks } from '@/services/cachedFirestoreService';

interface TaskItem {
  id: string;
  taskName: string;
  taskCategory: string;
}

interface SubtaskRow {
  id: string;
  subtaskId: string;
  relateDrawing: string;
  relateDrawingName: string;
  activity: string;
  relateWork: string;
  item: string | null;  // เพิ่ม | null
  internalRev: number | null;  // เพิ่ม | null
  workScale: string;
  assignee: string;
  deadline: string;
  progress: number;
}

interface ExistingSubtask {
  id: string;
  subTaskNumber: string;
  taskName: string;
  subTaskCategory: string;
  item: string;
  internalRev: string;
  subTaskScale: string;
  subTaskAssignee: string;
  subTaskProgress: number;
  startDate: any;
  endDate: any;
}

export default function TaskAssignment() {
  const { getCache, setCache, invalidateCache } = useFirestoreCache();
  
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [existingSubtasks, setExistingSubtasks] = useState<ExistingSubtask[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [rows, setRows] = useState<SubtaskRow[]>([
    {
      id: '1',
      subtaskId: '',
      relateDrawing: '',
      relateDrawingName: '',
      activity: '',
      relateWork: '',
      item: '',
      internalRev: null, // เปลี่ยนจาก 1 เป็น null
      workScale: 'S',
      assignee: '',
      deadline: '',
      progress: 0
    }
  ]);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const projectList = await getCachedProjects(getCache, setCache);
        setProjects(projectList);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [getCache, setCache]);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!selectedProject) {
        setTasks([]);
        setExistingSubtasks([]);
        setRows([{
          id: '1',
          subtaskId: '',
          relateDrawing: '',
          relateDrawingName: '',
          activity: '',
          relateWork: '',
          item: '',
          internalRev: null, // เปลี่ยนจาก 1 เป็น null
          workScale: 'S',
          assignee: '',
          deadline: '',
          progress: 0
        }]);
        return;
      }

      try {
        const taskList = await getCachedTasks(selectedProject, getCache, setCache);
        setTasks(taskList);

        const taskIds = taskList.map(t => t.id);
        const allSubtasks = await getCachedSubtasks(selectedProject, taskIds, getCache, setCache);
        setExistingSubtasks(allSubtasks);

        setRows([{
          id: '1',
          subtaskId: '',
          relateDrawing: '',
          relateDrawingName: '',
          activity: '',
          relateWork: '',
          item: '',
          internalRev: null, // เปลี่ยนจาก 1 เป็น null
          workScale: 'S',
          assignee: '',
          deadline: '',
          progress: 0
        }]);

      } catch (error) {
        console.error('Error fetching project data:', error);
      }
    };

    fetchProjectData();
  }, [selectedProject, getCache, setCache]);

  const checkAndAddNewRow = (updatedRows: SubtaskRow[]) => {
    const lastRow = updatedRows[updatedRows.length - 1];
    
    const hasRequiredFields = 
      lastRow.relateDrawing !== '' &&
      lastRow.relateWork !== '' &&
      lastRow.workScale !== '' &&
      lastRow.assignee !== '';

    if (hasRequiredFields) {
      const newId = String(parseInt(lastRow.id) + 1);
      const newRow: SubtaskRow = {
        id: newId,
        subtaskId: '',
        relateDrawing: '',
        relateDrawingName: '',
        activity: '',
        relateWork: '',
        item: '',
        internalRev: null, // เปลี่ยนจาก 1 เป็น null
        workScale: 'S',
        assignee: '',
        deadline: '',
        progress: 0
      };
      return [...updatedRows, newRow];
    }

    return updatedRows;
  };

  const updateRow = (id: string, field: keyof SubtaskRow, value: any) => {
    setRows(prevRows => {
      const updatedRows = prevRows.map(row => {
        if (row.id === id) {
          return { ...row, [field]: value };
        }
        return row;
      });

      return checkAndAddNewRow(updatedRows);
    });
  };

  const validateRows = (): { valid: boolean; message?: string } => {
    const filledRows = rows.filter(row => 
      row.activity || row.relateDrawing || row.relateWork || row.assignee
    );

    if (filledRows.length === 0) {
      return { valid: false, message: 'กรุณากรอกข้อมูลอย่างน้อย 1 แถว' };
    }

    for (const row of filledRows) {
      if (!row.activity) {
        return { valid: false, message: 'กรุณาเลือก Activity' };
      }
      if (!row.relateDrawing) {
        return { valid: false, message: 'กรุณาเลือก Relate Drawing' };
      }
      if (!row.relateWork) {
        return { valid: false, message: 'กรุณาเลือก Relate Work' };
      }
      if (!row.workScale) {
        return { valid: false, message: 'กรุณาเลือก Work Scale' };
      }
      if (!row.assignee) {
        return { valid: false, message: 'กรุณาเลือก Assignee' };
      }
    }

    return { valid: true };
  };

  const handleShowConfirmation = () => {
    const validation = validateRows();
    if (!validation.valid) {
      alert(validation.message);
      return;
    }
    setShowConfirmModal(true);
  };

  const getValidRows = () => {
    return rows.filter(row => 
      row.activity && row.relateDrawing && row.relateWork && row.workScale && row.assignee
    );
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    const validRows = getValidRows();

    try {
      for (const row of validRows) {
        const subtaskData = {
          subTaskNumber: `${selectedProject}-${row.activity}-${Date.now()}`,
          taskName: row.relateDrawingName,
          subTaskName: row.relateWork,
          subTaskCategory: row.relateWork,
          item: row.item || '',
          internalRev: String(row.internalRev),
          subTaskScale: row.workScale,
          subTaskAssignee: row.assignee,
          subTaskProgress: 0,
          lastUpdate: Timestamp.now(),
          startDate: null,
          endDate: null,
          mhOD: 0,
          mhOT: 0,
          remark: '',
          project: selectedProject,
          subTaskFiles: []
        };

        const subtasksCol = collection(db, 'tasks', row.relateDrawing, 'subtasks');
        await addDoc(subtasksCol, subtaskData);
      }

      alert('บันทึกข้อมูลสำเร็จ!');
      
      invalidateCache(`tasks_projectId:${selectedProject}`);
      invalidateCache(`subtasks_projectId:${selectedProject}`);
      
      setShowConfirmModal(false);
      
      const taskList = await getCachedTasks(selectedProject, getCache, setCache);
      setTasks(taskList);
      
      const taskIds = taskList.map(t => t.id);
      const allSubtasks = await getCachedSubtasks(selectedProject, taskIds, getCache, setCache);
      setExistingSubtasks(allSubtasks);
      
      setRows([{
        id: '1',
        subtaskId: '',
        relateDrawing: '',
        relateDrawingName: '',
        activity: '',
        relateWork: '',
        item: '',
        internalRev: null, // เปลี่ยนจาก 1 เป็น null
        workScale: 'S',
        assignee: '',
        deadline: '',
        progress: 0
      }]);

    } catch (error) {
      console.error('Error saving subtasks:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  const uniqueCategories = Array.from(new Set(tasks.map(t => t.taskCategory).filter(c => c)));

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <div className="flex-1 flex flex-col px-4 py-6 overflow-hidden">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Task Assignment</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Name
          </label>
          <Select
            options={projects.map(p => ({ value: p.id, label: p.name }))}
            value={selectedProject}
            onChange={setSelectedProject}
            placeholder="Select Project"
            loading={loading}
          />
        </div>

        <div className="flex-1 bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="h-full overflow-auto">
            <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-orange-600 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="w-[9%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Subtask ID</th>
                  <th className="w-[7%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Activity</th>
                  <th className="w-[12%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Relate Drawing</th>
                  <th className="w-[10%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Relate Work</th>
                  <th className="w-[8%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Item</th>
                  <th className="w-[5%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Internal Rev.</th>
                  <th className="w-[5%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Work Scale</th>
                  <th className="w-[9%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Assignee</th>
                  <th className="w-[7%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Deadline</th>
                  <th className="w-[9%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Progress</th>
                  <th className="w-[8%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Link File</th>
                  <th className="w-[7%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Correct</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row) => (
                  <tr key={`new-${row.id}`} className="hover:bg-gray-50 bg-blue-50">
                    <td className="px-2 py-2 text-xs text-gray-900">
                      <span className="text-blue-600 font-semibold">NEW</span>
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        options={uniqueCategories.map(cat => ({ 
                          value: cat,
                          label: cat 
                        }))}
                        value={row.activity}
                        onChange={(value) => {
                          updateRow(row.id, 'activity', value);
                          updateRow(row.id, 'relateWork', '');
                        }}
                        placeholder="Select"
                        disabled={!selectedProject}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        options={tasks
                          .filter(t => !row.activity || t.taskCategory === row.activity)  // เพิ่มการ filter ตาม activity
                          .map(t => ({ 
                            value: t.id,
                            label: t.taskName 
                          }))}
                        value={row.relateDrawing}
                        onChange={(value) => {
                          const task = tasks.find(t => t.id === value);
                          updateRow(row.id, 'relateDrawing', value);
                          updateRow(row.id, 'relateDrawingName', task?.taskName || '');
                          updateRow(row.id, 'activity', task?.taskCategory || '');
                        }}
                        placeholder="Select"
                        disabled={!selectedProject || !row.activity}  // เพิ่มเงื่อนไข disable ถ้ายังไม่เลือก activity
                      />
                    </td>
                    <td className="px-2 py-2">
                      <RelateWorkSelect
                        activityId={row.activity}
                        value={row.relateWork}
                        onChange={(value) => updateRow(row.id, 'relateWork', value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={row.item || ''}  // เพิ่ม || '' เพื่อให้เป็นค่าว่างถ้าไม่มีข้อมูล
                        onChange={(e) => updateRow(row.id, 'item', e.target.value)}
                        placeholder="Item"
                        className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900"  // เพิ่ม text-gray-900 สำหรับสีดำ
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input
                        type="number"
                        value={row.internalRev || ''}  // เพิ่ม || '' เพื่อให้เป็นค่าว่างถ้าไม่มีข้อมูล
                        onChange={(e) => {
                          const val = e.target.value ? parseInt(e.target.value) : '';  // ปรับการแปลงค่า
                          updateRow(row.id, 'internalRev', val);
                        }}
                        className="w-full px-1 py-1 border border-gray-300 rounded text-center text-xs text-gray-900"  // เพิ่ม text-gray-900
                        min="1"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        options={[
                          { value: 'S', label: 'S' },
                          { value: 'M', label: 'M' },
                          { value: 'L', label: 'L' }
                        ]}
                        value={row.workScale}
                        onChange={(value) => updateRow(row.id, 'workScale', value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <AssigneeSelect
                        value={row.assignee}
                        onChange={(value) => updateRow(row.id, 'assignee', value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={row.deadline}
                        onChange={(e) => updateRow(row.id, 'deadline', e.target.value)}
                        placeholder="3 Days"
                        className="w-full px-1 py-1 border border-gray-300 rounded text-xs"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <ProgressBar value={row.progress} size="sm" />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Button variant="outline" size="sm" disabled>
                        LINK
                      </Button>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className="text-xs text-gray-400">-</span>
                    </td>
                  </tr>
                ))}

                {existingSubtasks.map((subtask) => (
                  <tr key={`existing-${subtask.id}`} className="hover:bg-gray-50">
                    <td className="px-2 py-2 text-xs text-gray-900 truncate" title={subtask.subTaskNumber}>
                      {subtask.subTaskNumber}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-500">-</td>
                    <td className="px-2 py-2 text-xs text-gray-500 truncate" title={subtask.taskName}>
                      {subtask.taskName}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-500 truncate" title={subtask.subTaskCategory}>
                      {subtask.subTaskCategory}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-500 truncate" title={subtask.item}>
                      {subtask.item || '-'}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-500 text-center">
                      {subtask.internalRev}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-500 text-center">
                      {subtask.subTaskScale}
                    </td>
                    <td className="px-2 py-2">
                      {subtask.subTaskAssignee && (
                        <Badge name={subtask.subTaskAssignee} size="sm" showFullName={false} />
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-500">-</td>
                    <td className="px-2 py-2">
                      <ProgressBar value={subtask.subTaskProgress} size="sm" />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Button variant="outline" size="sm">LINK</Button>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-center space-x-1">
                        <button onClick={() => alert(`Edit: ${subtask.id}`)} className="p-1 text-gray-600 hover:text-blue-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <span className="text-gray-300">/</span>
                        <button onClick={() => alert(`Delete: ${subtask.id}`)} className="p-1 text-gray-600 hover:text-red-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-center">
          <Button size="lg" onClick={handleShowConfirmation} disabled={!selectedProject} className="px-12">
            Assign Task
          </Button>
        </div>
      </div>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="ยืนยันการบันทึกข้อมูล"
        size="xl"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)} disabled={isSaving}>
              ยกเลิก
            </Button>
            <Button onClick={handleConfirmSave} disabled={isSaving}>
              {isSaving ? 'กำลังบันทึก...' : 'ยืนยันการบันทึก'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">กรุณาตรวจสอบข้อมูลก่อนบันทึก</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-yellow-800">
                {getValidRows().length}
              </div>
              <div className="text-sm text-yellow-600">รายการ</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-800">
                {getValidRows().filter(r => r.subtaskId !== '').length}
              </div>
              <div className="text-sm text-blue-600">เพิ่มข้อมูลใหม่</div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ประเภท</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Relate Drawing</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Relate Work</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Scale</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignee</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getValidRows().map((row, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        ใหม่
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.activity}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.relateDrawingName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.relateWork}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{row.item || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.workScale}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.assignee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
}