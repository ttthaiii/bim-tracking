'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, setDoc, doc, Timestamp, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Navbar from '@/components/shared/Navbar';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import Modal from '@/components/ui/Modal';
import SuccessModal from '@/components/ui/SuccessModal';
import RelateWorkSelect from './components/RelateWorkSelect';
import AssigneeSelect from './components/AssigneeSelect';
import { useFirestoreCache } from '@/contexts/FirestoreCacheContext';
import { getCachedProjects, getCachedTasks, getCachedSubtasks } from '@/services/cachedFirestoreService';
import { calculateDeadlineStatus } from '@/utils/deadlineCalculator'; // ⬅️ เพิ่มบรรทัดนี้

interface TaskItem {
  id: string;
  taskName: string;
  taskCategory: string;
  dueDate?: any;
}

interface SubtaskRow {
  id: string;
  subtaskId: string;
  relateDrawing: string;
  relateDrawingName: string;
  activity: string;
  relateWork: string;
  item: string | null;
  internalRev: number | null;
  workScale: string;
  assignee: string;
  deadline: string;
  progress: number;
}

// ✅ โค้ดใหม่
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
  deadlineStatus?: { // ⬅️ เพิ่มนี้
    text: string;
    bgColor: string;
    isOverdue: boolean;
  };
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successNewCount, setSuccessNewCount] = useState(0);
  const [successUpdateCount, setSuccessUpdateCount] = useState(0);
  const [rows, setRows] = useState<SubtaskRow[]>([
    {
      id: '1',
      subtaskId: '',
      relateDrawing: '',
      relateDrawingName: '',
      activity: '',
      relateWork: '',
      item: '',
      internalRev: null,
      workScale: 'S',
      assignee: '',
      deadline: '',
      progress: 0
    }
  ]);

// ✅ โค้ดใหม่ - เรียบง่าย ไม่โหลดทุก Project
  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      try {
        const projectList = await getCachedProjects(getCache, setCache);
        setProjects(projectList);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []); // ⬅️ Empty deps = ทำงานครั้งเดียวตอน mount

// ✅ โค้ดใหม่
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
          internalRev: null,
          workScale: 'S',
          assignee: '',
          deadline: '',
          progress: 0
        }]);
        return;
      }

      try {
        // ✅ 1. โหลด Tasks (พร้อม dueDate)
        const tasksCol = collection(db, 'tasks');
        const tasksSnapshot = await getDocs(tasksCol);
        const taskList = tasksSnapshot.docs
          .filter(doc => doc.data().projectId === selectedProject)
          .map(doc => ({
            id: doc.id,
            taskName: doc.data().taskName || '',
            taskCategory: doc.data().taskCategory || '',
            dueDate: doc.data().dueDate || null // ⬅️ เพิ่ม dueDate
          }));
        
        setTasks(taskList);

        // ✅ 2. โหลด Subtasks
        const taskIds = taskList.map(t => t.id);
        const allSubtasks = await getCachedSubtasks(selectedProject, taskIds, getCache, setCache);

        // ✅ 3. คำนวณ Deadline Status สำหรับแต่ละ Subtask
        const subtasksWithDeadline = allSubtasks.map(subtask => {
          // หา Task ที่ taskName ตรงกัน
          const task = taskList.find(t => t.taskName === subtask.taskName);
          
          if (!task || !task.dueDate) {
            return {
              ...subtask,
              deadlineStatus: {
                text: '-',
                bgColor: '',
                isOverdue: false
              }
            };
          }

          // คำนวณ Deadline Status
          const deadlineStatus = calculateDeadlineStatus(
            subtask.subTaskProgress,
            task.dueDate,
            subtask.endDate
          );

          return {
            ...subtask,
            deadlineStatus
          };
        });

        setExistingSubtasks(subtasksWithDeadline);

        setRows([{
          id: '1',
          subtaskId: '',
          relateDrawing: '',
          relateDrawingName: '',
          activity: '',
          relateWork: '',
          item: '',
          internalRev: null,
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
  }, [selectedProject]);

  const updateRow = (id: string, field: keyof SubtaskRow, value: any): void => {
  console.log('🔄 updateRow called:', { id, field, value });

  setRows((prevRows: SubtaskRow[]): SubtaskRow[] => {
    const rowIndex = prevRows.findIndex(r => r.id === id);
    if (rowIndex === -1) {
      console.warn('⚠️ Row not found:', id);
      return prevRows;
    }

    const currentRow = prevRows[rowIndex];

    if ((currentRow as any)[field] === value) {
      console.log('⏭️ Skip update - value unchanged');
      return prevRows;
    }
    // 🆕 Guard: ถ้าค่าเดิมเท่ากับค่าใหม่ → skip
    if ((currentRow as any)[field] === value) {
      console.log('⏭️ Skip update - value unchanged');
      return prevRows;
    }

    const newRows = [...prevRows];
    const updatedRow = { ...currentRow };

    // Update the field
    if (field === 'activity') {
      console.log('📝 Activity changed from', updatedRow.activity, 'to', value);
      updatedRow.activity = value;
      
      // รีเซ็ตเฉพาะเมื่อเปลี่ยนค่าจริงๆ
      updatedRow.relateWork = '';
      updatedRow.relateDrawing = '';
      updatedRow.relateDrawingName = '';
      updatedRow.assignee = '';
      
    } else if (field === 'relateDrawing') {
      const task = tasks.find(t => t.id === value);
      updatedRow.relateDrawing = value;
      updatedRow.relateDrawingName = task?.taskName || '';
      
      console.log('📝 Relate Drawing changed:', {
        taskId: value,
        taskName: task?.taskName
      });
      
      // เช็คเงื่อนไขพิเศษ
      const selectedProjectData = projects.find(p => p.id === selectedProject);
      const projectName = selectedProjectData?.name || '';
      
      if (
        projectName === "Bim room" &&
        updatedRow.activity === "ลางาน" &&
        (task?.taskName || '') === "ลางาน"
      ) {
        console.log('🎯 Special Leave Case - Auto-fill assignee as "all"');
        updatedRow.assignee = 'all';
      }
      
    } else {
      (updatedRow as any)[field] = value;
    }

    newRows[rowIndex] = updatedRow;

    console.log('✅ Updated row:', {
      id: updatedRow.id,
      activity: updatedRow.activity,
      relateDrawing: updatedRow.relateDrawingName,
      relateWork: updatedRow.relateWork,
      assignee: updatedRow.assignee
    });

    // เช็คว่าควรเพิ่มแถวใหม่หรือไม่
    const isLastRow = rowIndex === prevRows.length - 1;
    const hasBasicFields = 
      updatedRow.activity &&
      updatedRow.relateDrawing &&
      updatedRow.relateWork &&
      updatedRow.workScale;
    const hasAssignee = updatedRow.assignee || isSpecialLeaveCase(updatedRow);
    const isRowComplete = hasBasicFields && hasAssignee;
    
    if (isLastRow && isRowComplete) {
      const hasEmptyRow = newRows.some(row => 
        !row.activity && !row.relateDrawing && !row.relateWork
      );
      
      if (!hasEmptyRow) {
        console.log('➕ Adding new empty row');
        
        newRows.push({
          id: String(Date.now()),
          subtaskId: '',
          relateDrawing: '',
          relateDrawingName: '',
          activity: '',
          relateWork: '',
          item: '',
          internalRev: null,
          workScale: 'S',
          assignee: '',
          deadline: '',
          progress: 0
        });
      }
    }

    return newRows;
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
      // เช็คว่าเป็นกรณีพิเศษหรือไม่
      const isSpecial = isSpecialLeaveCase(row);
      if (!isSpecial) {
        return { valid: false, message: 'กรุณาเลือก Assignee' };
      }
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
  return rows.filter(row => {
    const hasBasicFields = row.activity && row.relateDrawing && row.relateWork && row.workScale;
    
    // 🆕 กรณีพิเศษ: ถ้า assignee = "all" ก็ถือว่า valid
    const hasAssignee = row.assignee || isSpecialLeaveCase(row);
    
    return hasBasicFields && hasAssignee;
  });
};

  const generateSubTaskNumber = async (taskId: string) => {
    try {
      const taskDoc = await getDoc(doc(db, 'tasks', taskId));
      const taskNumber = taskDoc.data()?.taskNumber;

      if (!taskNumber) return null;

      const subtasksRef = collection(db, 'tasks', taskId, 'subtasks');
      const subtasksSnapshot = await getDocs(subtasksRef);
      
      const currentSubtasks = subtasksSnapshot.docs.map(doc => doc.data().subTaskNumber);
      let maxRunningNumber = 0;

      currentSubtasks.forEach(number => {
        if (!number) return;
        const match = number.match(/-(\d{2})$/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxRunningNumber) {
            maxRunningNumber = num;
          }
        }
      });

      const nextRunningNumber = maxRunningNumber + 1;
      const paddedNumber = nextRunningNumber.toString().padStart(2, '0');
      
      return `${taskNumber}-${paddedNumber}`;
    } catch (error) {
      console.error('Error generating subtask number:', error);
      return null;
    }
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      const rowsToSave = rows.filter(row => 
        row.relateDrawing && row.activity && row.relateWork && row.workScale && row.assignee
      );

      console.log('🔄 Rows to save:', rowsToSave);

      const selectedProjectData = projects.find(p => p.id === selectedProject);
      const projectName = selectedProjectData?.name || '';
      console.log('📦 Project Name:', projectName);

      for (const row of rowsToSave) {
        console.log('📝 Processing row:', row);
        const subTaskNumber = await generateSubTaskNumber(row.relateDrawing);
        
        if (!subTaskNumber) {
          console.error('Failed to generate subTaskNumber');
          continue;
        }
        
        // 🆕 เพิ่มบรรทัดนี้ก่อน docData
        const finalAssignee = isSpecialLeaveCase(row) ? 'all' : row.assignee;

        const docData = {
          // ข้อมูลที่ต้องเก็บค่า
          subTaskNumber,                        // generate อัตโนมัติ
          projectId: selectedProject,           // เก็บเฉพาะ ID
          project: projectName,
          taskName: row.relateDrawingName,     // จาก Relate Drawing
          subTaskName: row.relateWork,         // จาก Relate Work
          subTaskCategory: row.relateWork,     // จาก Relate Work
          subTaskScale: row.workScale,         // จาก Work Scale
          subTaskAssignee: finalAssignee,       // จาก Assignee
          item: row.item || null,              // จาก Item
          internalRev: row.internalRev || null, // จาก Internal Rev.

          // ข้อมูลที่ยังไม่ต้องเก็บค่า (set เป็น null)
          endDate: null,
          lastUpdate: null,
          mhOD: null,
          mhOT: null,
          remark: null,
          startDate: null,
          subTaskFiles: null,
          subTaskProgress: null,
          wlFromscale: null,
          wlRemaining: null
        };

        console.log('📄 Document data to save:', docData);
        
        await setDoc(doc(db, 'tasks', row.relateDrawing, 'subtasks', subTaskNumber), docData);
      }
            // 🆕 เก็บจำนวนรายการที่บันทึก
      const newItemsCount = rowsToSave.length;
      const updateItemsCount = 0; // อนาคตจะนับจากการแก้ไข existing subtasks

      // ✅ โค้ดใหม่ - เพิ่ม Cache Invalidation
      // ✅ Invalidate Cache หลังบันทึกสำเร็จ
      const cacheKey = `subtasks_projectId:${selectedProject}`;
      invalidateCache(cacheKey);
      
      setShowConfirmModal(false);
      setRows([{
        id: '1',
        subtaskId: '',
        relateDrawing: '',
        relateDrawingName: '',
        activity: '',
        relateWork: '',
        item: '',
        internalRev: null,
        workScale: 'S',
        assignee: '',
        deadline: '',
        progress: 0
      }]);
      
      setSuccessNewCount(newItemsCount);
      setSuccessUpdateCount(updateItemsCount);
      setShowSuccessModal(true);
      
      // ✅ Reload ข้อมูล Subtasks ใหม่
      const taskIds = tasks.map(t => t.id);
      const updatedSubtasks = await getCachedSubtasks(
        selectedProject, 
        taskIds, 
        getCache, 
        setCache
      );
      setExistingSubtasks(updatedSubtasks);
      
    } catch (error) {
      console.error('Error saving subtasks:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    } 
  };
    // 🆕 เพิ่ม function ใหม่ตรงนี้
      const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        setSuccessNewCount(0);
        setSuccessUpdateCount(0);
  };
  

  // ✅ Memoize uniqueCategories
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(tasks.map(t => t.taskCategory).filter(c => c)));
  }, [tasks]);

  // ✅ Memoize categoryOptions
  const categoryOptions = useMemo(() => {
    return uniqueCategories.map(cat => ({ 
      value: cat,
      label: cat 
    }));
  }, [uniqueCategories]);

// ✅ โค้ดใหม่ - เรียบง่าย
  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    // ✅ ไม่ต้องทำอะไรเพิ่ม - ให้ useEffect จัดการ
  };

  const deleteRow = (id: string) => {
    setRows(prevRows => {
      if (prevRows.length === 1) {
        return [{
          id: '1',
          subtaskId: '',
          relateDrawing: '',
          relateDrawingName: '',
          activity: '',
          relateWork: '',
          item: '',
          internalRev: null,
          workScale: 'S',
          assignee: '',
          deadline: '',
          progress: 0
        }];
      }
      return prevRows.filter(row => row.id !== id);
    });
  };

    // 🆕 เพิ่มตรงนี้ (บรรทัด 503)
  const isSpecialLeaveCase = (row: SubtaskRow): boolean => {
    const selectedProjectData = projects.find(p => p.id === selectedProject);
    const projectName = selectedProjectData?.name || '';
    
    return (
      projectName === "Bim room" &&
      row.activity === "ลางาน" &&
      row.relateDrawingName === "ลางาน"
    );
  };

  // 🆕 Function สำหรับคำนวณ Deadline Status ของ Existing Subtasks
  const calculateSubtaskDeadlines = (
    subtasks: ExistingSubtask[],
    tasksList: TaskItem[]
  ): ExistingSubtask[] => {
    return subtasks.map(subtask => {
      // หา Task ที่ taskName ตรงกับ subtask.taskName
      const task = tasksList.find(t => t.taskName === subtask.taskName);
      
      if (!task) {
        // ถ้าหาไม่เจอ Task → แสดง "-"
        return {
          ...subtask,
          deadlineStatus: {
            text: '-',
            bgColor: '',
            isOverdue: false
          }
        };
      }

      // ดึง dueDate จาก Task (ต้องดึงจาก Firestore ด้วย)
      // สำหรับตอนนี้เราจะดึงใน useEffect แทน
      return subtask;
    });
  };

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
            onChange={handleProjectChange}
            placeholder="Select Project"
            loading={loading}
          />
        </div>

        <div className="flex-1 bg-white rounded-lg shadow overflow-hidden mb-6">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-600 border-t-transparent" />
              <div className="mt-6 text-base font-medium text-gray-600">กำลังโหลดข้อมูล...</div>
              <div className="mt-2 text-sm text-gray-500">กำลังเตรียมข้อมูลและ Cache</div>
              <div className="mt-1 text-xs text-gray-400">โปรดรอสักครู่</div>
            </div>
          ) : (
            <div className="h-full overflow-auto">
              <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
                <thead className="bg-orange-600 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="w-[15%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Subtask ID</th>
                    <th className="w-[7%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Activity</th>
                    <th className="w-[12%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Relate Drawing</th>
                    <th className="w-[10%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Relate Work</th>
                    <th className="w-[8%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Item</th>
                    <th className="w-[5%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Internal Rev.</th>
                    <th className="w-[5%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Work Scale</th>
                    <th className="w-[9%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Assignee</th>
                    <th className="w-[7%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Deadline</th>
                    <th className="w-[7%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Progress</th>
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
                          key={`activity-${row.id}-${row.activity}`}
                          options={categoryOptions}
                          value={row.activity}
                          onChange={(value) => {
                            console.log('🎯 Activity onChange:', value);
                            updateRow(row.id, 'activity', value);
                          }}
                          placeholder="Select"
                          disabled={!selectedProject}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Select
                          options={tasks
                            .filter(t => !row.activity || t.taskCategory === row.activity)
                            .map(t => ({ 
                              value: t.id,
                              label: t.taskName 
                            }))}
                          value={row.relateDrawing}
                          onChange={(value) => updateRow(row.id, 'relateDrawing', value)}
                          placeholder="Select"
                          disabled={!selectedProject || !row.activity}
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
                          value={row.item || ''}
                          onChange={(e) => updateRow(row.id, 'item', e.target.value)}
                          placeholder="Item"
                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="number"
                          value={row.internalRev || ''}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : '';
                            updateRow(row.id, 'internalRev', val);
                          }}
                          className="w-full px-1 py-1 border border-gray-300 rounded text-center text-xs text-gray-900"
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
  {isSpecialLeaveCase(row) ? (
    <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm text-gray-900">
      all
    </div>
  ) : (
    <AssigneeSelect
      value={row.assignee}
      onChange={(value) => updateRow(row.id, 'assignee', value)}
    />
  )}
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
                        <div className="flex items-center space-x-2">
                          <ProgressBar value={row.progress} size="sm" />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={row.progress}
                            onChange={(e) => {
                              const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                              updateRow(row.id, 'progress', value);
                            }}
                            className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Button variant="outline" size="sm" disabled>
                          LINK
                        </Button>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button 
                          onClick={() => deleteRow(row.id)}
                          className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                          title="ลบแถวนี้"
                        >
                          <svg 
                            className="w-4 h-4" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}

                  
{existingSubtasks.map((subtask) => {
  // ✅ ดึง deadlineStatus (ถ้ามี)
  const deadlineStatus = subtask.deadlineStatus || {
    text: '-',
    bgColor: '',
    isOverdue: false
  };

  return (
    <tr 
      key={`existing-${subtask.id}`} 
      className={`hover:bg-gray-50 ${deadlineStatus.bgColor}`}
    >
      <td className="px-2 py-2 text-xs text-gray-900 whitespace-normal break-words" title={subtask.subTaskNumber}>
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
        {subtask.internalRev ? subtask.internalRev : '-'}
      </td>
      <td className="px-2 py-2 text-xs text-gray-500 text-center">
        {subtask.subTaskScale}
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-xs font-medium text-white">
              {subtask.subTaskAssignee?.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-xs text-gray-900">
            {subtask.subTaskAssignee}
          </span>
        </div>
      </td>
      {/* ✅ แก้คอลัมน์ DEADLINE - แสดงค่าจริง */}
      <td className="px-2 py-2 text-xs">
        <span className={`font-medium ${
          deadlineStatus.isOverdue ? 'text-red-600' : 
          deadlineStatus.bgColor === 'bg-yellow-50' ? 'text-yellow-700' : 
          'text-gray-700'
        }`}>
          {deadlineStatus.text}
        </span>
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center space-x-2">
          <ProgressBar value={subtask.subTaskProgress} size="sm" />
        </div>
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
  );
})}
                </tbody>
              </table>
            </div>
          )}
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
            <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccessModal}
        newCount={successNewCount}
        updateCount={successUpdateCount}
      />
    </div>
  );
}