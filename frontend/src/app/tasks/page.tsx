'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, setDoc, doc, Timestamp, getDoc } from 'firebase/firestore'; // ✅ เพิ่ม getDoc
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
  taskStatus?: string; // ✅ ต้องมี field นี้
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
  subTaskFiles?: Array<{    // ⬅️ เพิ่มนี้
    fileName: string;
    fileUrl: string;
  }> | null;
  // 🔧 เพิ่มข้อมูลเหล่านี้
  activity?: string;
  relateDrawing?: string;
  _isEdited?: boolean; // ✅ เพิ่มบรรทัดนี้
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

    // ✅ เพิ่มตรงนี้! ⬇️⬇️⬇️
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    fileName: string;
    fileUrl: string;
  } | null>(null);

  // ✅ เพิ่ม State สำหรับ Delete Confirmation
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletingSubtask, setDeletingSubtask] = useState<{
    id: string;
    subTaskNumber: string;
    taskName: string;
    subTaskCategory: string;
  } | null>(null);

   // ✅ เพิ่ม State สำหรับ Edit Confirmation
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [editConfirmData, setEditConfirmData] = useState<{
    subtaskNumber: string;
    activity: string;
    relateDrawing: string;
    relateWork: string;
    item: string;
    internalRev: string | number;
    workScale: string;
    assignee: string;
  } | null>(null);

  // ✅ เพิ่ม State สำหรับ Edit Mode
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<{
    activity: string;
    relateDrawing: string;
    relateDrawingName: string;
    relateWork: string;
    item: string;
    internalRev: number | null;
    workScale: string;
    assignee: string;
  } | null>(null);

  // ✅ เพิ่ม State สำหรับเก็บข้อมูลที่แก้ไขแล้ว (ยังไม่บันทึกลงฐานข้อมูล)
  const [editedSubtasks, setEditedSubtasks] = useState<{[key: string]: any}>({});

  // ✅ Function บันทึกการแก้ไขใน State เท่านั้น (ไม่บันทึกลงฐานข้อมูล)
  const handleSaveEditToState = () => {
    if (!editingSubtaskId || !editingData) return;

    const subtaskIndex = existingSubtasks.findIndex(s => s.id === editingSubtaskId);
    if (subtaskIndex === -1) return;

    // อัพเดท existing subtasks โดยตรง
    setExistingSubtasks(prev => {
      const updated = [...prev];
      updated[subtaskIndex] = {
        ...updated[subtaskIndex],
        // อัพเดทข้อมูลที่แก้ไข
        subTaskCategory: editingData.relateWork,
        item: editingData.item || '',
        internalRev: editingData.internalRev ? String(editingData.internalRev) : '',
        subTaskScale: editingData.workScale,
        subTaskAssignee: editingData.assignee,
        taskName: editingData.relateDrawingName,
      };
      return updated;
    });

    // เก็บข้อมูลที่แก้ไขสำหรับการบันทึกภายหลัง
    setEditedSubtasks(prev => ({
      ...prev,
      [editingSubtaskId]: {
        ...existingSubtasks.find(s => s.id === editingSubtaskId), // ✅ เพิ่มข้อมูลเดิม
        id: editingSubtaskId,
        subTaskNumber: existingSubtasks.find(s => s.id === editingSubtaskId)?.subTaskNumber || '',
        taskName: editingData.relateDrawingName,
        subTaskCategory: editingData.relateWork,
        item: editingData.item || '',
        internalRev: editingData.internalRev ? String(editingData.internalRev) : '',
        subTaskScale: editingData.workScale,
        subTaskAssignee: editingData.assignee,
        // 🔧 เพิ่มข้อมูลเหล่านี้
        activity: editingData.activity,
        relateDrawing: editingData.relateDrawing,
        _isEdited: true
      }
    }));

    // ออกจาก Edit Mode
    handleCancelEdit();
  };

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
      // ✅ 1. โหลด Tasks (where ตัวเดียว - ไม่ต้อง Index)
      const tasksCol = collection(db, 'tasks');
      const q = query(tasksCol, where('projectId', '==', selectedProject));
      const tasksSnapshot = await getDocs(q);
      
      // ✅ 2. กรองใน JavaScript
      const taskList = tasksSnapshot.docs
        .filter(doc => {
          const data = doc.data();
          const status = data.taskStatus;
          
          // กรอง DELETED ออก (แต่เก็บ Tasks ที่ไม่มี taskStatus)
          if (status === 'DELETED') {
            console.log('🗑️ Filtered out DELETED task:', doc.id);
            return false;
          }
          
          return true;
        })
        .map(doc => {
          const data = doc.data();
          
          console.log('✅ Task loaded:', doc.id, 'Status:', data.taskStatus || '(no status)');
          
          return {
            id: doc.id,
            taskName: data.taskName || '',
            taskCategory: data.taskCategory || '',
            dueDate: data.dueDate || null
          };
        });
      
      setTasks(taskList);

      // ✅ 3. โหลด Subtasks
      const taskIds = taskList.map(t => t.id);
      
      console.log('📊 Loading subtasks for', taskIds.length, 'tasks');
      
      const allSubtasks = await getCachedSubtasks(selectedProject, taskIds, getCache, setCache);

      // ✅ 4. คำนวณ Deadline Status
      const subtasksWithDeadline = allSubtasks.map(subtask => {
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
      console.error('❌ Error fetching project data:', error);
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
    const hasNewItems = getValidRows().length > 0;
    const hasEditedItems = Object.keys(editedSubtasks).length > 0;
    
    if (!hasNewItems && !hasEditedItems) {
      alert('กรุณากรอกข้อมูลใหม่หรือแก้ไขข้อมูลเดิมอย่างน้อย 1 รายการ');
      return;
    }

    if (!validation.valid && hasNewItems) {
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

  // ✅ Function สำหรับลบ Task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('คุณต้องการลบ Task นี้หรือไม่?')) return;

    try {
      setIsSaving(true);

      // อัพเดท taskStatus เป็น DELETED
      await setDoc(
        doc(db, 'tasks', taskId),
        {
          taskStatus: 'DELETED',
          lastUpdate: Timestamp.now()
        },
        { merge: true }
      );

      // ✅ Invalidate Cache ทันที
      const cacheKey = `tasks_projectId:${selectedProject}`;
      invalidateCache(cacheKey);

      // Reload ข้อมูล
      const tasksCol = collection(db, 'tasks');
      const q = query(
        tasksCol,
        where('projectId', '==', selectedProject),
        where('taskStatus', '!=', 'DELETED')
      );
      const tasksSnapshot = await getDocs(q);
      
      const taskList = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        taskName: doc.data().taskName || '',
        taskCategory: doc.data().taskCategory || '',
        dueDate: doc.data().dueDate || null
      }));
      
      setTasks(taskList);

      // Reload Subtasks
      const taskIds = taskList.map(t => t.id);
      const updatedSubtasks = await getCachedSubtasks(
        selectedProject,
        taskIds,
        getCache,
        setCache
      );
      setExistingSubtasks(updatedSubtasks);

      alert('ลบ Task สำเร็จ!');

    } catch (error) {
      console.error('Error deleting task:', error);
      alert('เกิดข้อผิดพลาดในการลบ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      // 1. บันทึกรายการใหม่จาก rows
      const rowsToSave = rows.filter(row => 
        row.relateDrawing && row.activity && row.relateWork && row.workScale && row.assignee
      );

      // 2. บันทึกรายการที่แก้ไข
      const editedItems = Object.values(editedSubtasks);

      console.log('🔄 Rows to save (new):', rowsToSave);
      console.log('🔄 Items to save (edited):', editedItems);

      const selectedProjectData = projects.find(p => p.id === selectedProject);
      const projectName = selectedProjectData?.name || '';

      // บันทึกรายการใหม่
      for (const row of rowsToSave) {
        const subTaskNumber = await generateSubTaskNumber(row.relateDrawing);
        if (!subTaskNumber) continue;
        
        const finalAssignee = isSpecialLeaveCase(row) ? 'all' : row.assignee;

        const docData = {
          subTaskNumber,
          projectId: selectedProject,
          project: projectName,
          taskName: row.relateDrawingName,
          subTaskName: row.relateWork,
          subTaskCategory: row.relateWork,
          subTaskScale: row.workScale,
          subTaskAssignee: finalAssignee,
          item: row.item || null,
          internalRev: row.internalRev || null,
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

        await setDoc(doc(db, 'tasks', row.relateDrawing, 'subtasks', subTaskNumber), docData);
      }

      // 🔧 แก้ไขการบันทึกรายการที่แก้ไข - วิธีใหม่ที่ถูกต้อง
      for (const editedSubtask of editedItems) {
        const originalSubtask = existingSubtasks.find(s => s.id === editedSubtask.id);
        if (!originalSubtask) {
          console.warn('ไม่พบ originalSubtask สำหรับ:', editedSubtask.id);
          continue;
        }

        console.log('🔍 Processing edited subtask:', {
          originalSubtask: originalSubtask,
          editedSubtask: editedSubtask,
          originalId: originalSubtask.id
        });

        // 🔧 หา taskId ที่ถูกต้องจาก editedSubtask.relateDrawing
        const taskId = editedSubtask.relateDrawing;
        
        if (!taskId) {
          console.warn('ไม่มี taskId สำหรับ subtask:', editedSubtask.id);
          continue;
        }

        const docPath = `tasks/${taskId}/subtasks/${originalSubtask.subTaskNumber}`;
        console.log('📍 Document path:', docPath);

        try {
          const docData = {
            taskName: editedSubtask.taskName,
            subTaskName: editedSubtask.subTaskCategory,
            subTaskCategory: editedSubtask.subTaskCategory,
            item: editedSubtask.item || null,
            internalRev: editedSubtask.internalRev || null,
            subTaskScale: editedSubtask.subTaskScale,
            subTaskAssignee: editedSubtask.subTaskAssignee,
            lastUpdate: Timestamp.now()
          };

          console.log('💾 Saving document with data:', docData);

          await setDoc(
            doc(db, 'tasks', taskId, 'subtasks', originalSubtask.subTaskNumber),
            docData,
            { merge: true }
          );
          
          console.log('✅ บันทึก editedSubtask สำเร็จ:', docPath);
        } catch (docError) {
          console.error('❌ เกิดข้อผิดพลาดในการบันทึก editedSubtask:', docError);
          console.error('Document path:', docPath);
          console.error('TaskId used:', taskId);
          throw docError;
        }
      }

      // เก็บจำนวนรายการที่บันทึก
      const newItemsCount = rowsToSave.length;
      const updateItemsCount = editedItems.length;

      // Invalidate Cache
      const cacheKey = `subtasks_projectId:${selectedProject}`;
      invalidateCache(cacheKey);
      
      setShowConfirmModal(false);
      
      // รีเซ็ต State
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
      
      setEditedSubtasks({}); // รีเซ็ตข้อมูลที่แก้ไข
      
      setSuccessNewCount(newItemsCount);
      setSuccessUpdateCount(updateItemsCount);
      setShowSuccessModal(true);
      
      // Reload ข้อมูล Subtasks ใหม่
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
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ';
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + errorMessage);
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

// ✅ Function แปลง Firebase Storage URL → Cloudflare CDN URL
  const convertToCdnUrl = (fileUrl: string): string => {
    // ถ้า URL มาจาก Firebase Storage
    if (fileUrl.includes('firebasestorage.googleapis.com')) {
      // แยก path จาก URL
      const match = fileUrl.match(/o\/(.+?)\?/);
      if (match) {
        const path = decodeURIComponent(match[1]);
        return `https://bim-tracking-cdn.ttthaiii30.workers.dev/${path}`;
      }
    }
    
    // ถ้าเป็น path ธรรมดา (ไม่มี https://)
    if (!fileUrl.startsWith('http')) {
      return `https://bim-tracking-cdn.ttthaiii30.workers.dev/${fileUrl}`;
    }
    
    // ถ้าเป็น URL อื่นๆ ให้ใช้ตามเดิม
    return fileUrl;
  };

  // ✅ Function เปิดไฟล์
  const handleOpenFile = (file: { fileName: string; fileUrl: string }) => {
    const cdnUrl = convertToCdnUrl(file.fileUrl);
    setSelectedFile({
      fileName: file.fileName,
      fileUrl: cdnUrl
    });
    setShowFileModal(true);
  };

  // ✅ Function เริ่ม Edit Mode
  const handleStartEdit = (subtask: ExistingSubtask) => {
    const task = tasks.find(t => t.taskName === subtask.taskName);
    
    setEditingSubtaskId(subtask.id);
    setEditingData({
      activity: task?.taskCategory || '',
      relateDrawing: task?.id || '',
      relateDrawingName: subtask.taskName,
      relateWork: subtask.subTaskCategory,
      item: subtask.item || '',
      internalRev: subtask.internalRev ? parseInt(subtask.internalRev) : null,
      workScale: subtask.subTaskScale,
      assignee: subtask.subTaskAssignee
    });
  };

  // ✅ Function ยกเลิก Edit
  const handleCancelEdit = () => {
    setEditingSubtaskId(null);
    setEditingData(null);
  };

  // ✅ Function อัพเดทข้อมูลใน Edit Mode
  const handleUpdateEditData = (field: string, value: any) => {
    if (!editingData) return;

    setEditingData(prev => {
      if (!prev) return prev;
      
      const updated = { ...prev, [field]: value };
      
      // ถ้าเปลี่ยน Activity → รีเซ็ต Relate Drawing และ Relate Work
      if (field === 'activity') {
        updated.relateDrawing = '';
        updated.relateDrawingName = '';
        updated.relateWork = '';
        updated.assignee = '';
      }
      
      // ถ้าเปลี่ยน Relate Drawing
      if (field === 'relateDrawing') {
        const task = tasks.find(t => t.id === value);
        updated.relateDrawingName = task?.taskName || '';
        updated.relateWork = '';
        
        // เช็คเงื่อนไขพิเศษ (Bim room + ลางาน)
        const selectedProjectData = projects.find(p => p.id === selectedProject);
        const projectName = selectedProjectData?.name || '';
        
        if (
          projectName === "Bim room" &&
          updated.activity === "ลางาน" &&
          task?.taskName === "ลางาน"
        ) {
          updated.assignee = 'all';
        }
      }
      
      return updated;
    });
  };

  // ✅ Function เตรียมข้อมูลสำหรับ Confirmation
  const handlePrepareEditConfirm = () => {
    if (!editingSubtaskId || !editingData) return;

    const subtask = existingSubtasks.find(s => s.id === editingSubtaskId);
    if (!subtask) return;

    setEditConfirmData({
      subtaskNumber: subtask.subTaskNumber,
      activity: editingData.activity,
      relateDrawing: editingData.relateDrawingName,
      relateWork: editingData.relateWork,
      item: editingData.item || '-',
      internalRev: editingData.internalRev || '-',
      workScale: editingData.workScale,
      assignee: editingData.assignee
    });

    setShowEditConfirmModal(true);
  };

  // ✅ Function บันทึกหลังจากยืนยัน
  const handleConfirmEditSave = async () => {
    if (!editingSubtaskId || !editingData) return;

    setIsSaving(true);
    try {
      const subtask = existingSubtasks.find(s => s.id === editingSubtaskId);
      if (!subtask) return;

      // 🔧 แก้ไขตรงนี้: ใช้ Task ID ที่ถูกต้อง
      const taskId = editingData.relateDrawing; // นี่คือ Task ID ที่ถูกต้องแล้ว
      
      // บันทึกลง Firestore
      await setDoc(
        doc(db, 'tasks', taskId, 'subtasks', subtask.subTaskNumber), // ✅ ใช้ taskId แทน
        {
          taskName: editingData.relateDrawingName,
          subTaskName: editingData.relateWork,
          subTaskCategory: editingData.relateWork,
          item: editingData.item || null,
          internalRev: editingData.internalRev ? String(editingData.internalRev) : null,
          subTaskScale: editingData.workScale,
          subTaskAssignee: editingData.assignee,
          lastUpdate: Timestamp.now()
        },
        { merge: true }
      );

      // Invalidate Cache
      const cacheKey = `subtasks_projectId:${selectedProject}`;
      invalidateCache(cacheKey);

      // รีเฟรชข้อมูล
      const taskIds = tasks.map(t => t.id);
      const updatedSubtasks = await getCachedSubtasks(
        selectedProject,
        taskIds,
        getCache,
        setCache
      );
      setExistingSubtasks(updatedSubtasks);

      // ปิด Edit Mode และ Confirmation Modal
      handleCancelEdit();
      setShowEditConfirmModal(false);
      setEditConfirmData(null);

      // แสดง Success Modal
      setSuccessNewCount(0);
      setSuccessUpdateCount(1);
      setShowSuccessModal(true);

    } catch (error) {
      console.error('Error saving edit:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Function เตรียมลบ Subtask
  const handlePrepareDelete = (subtask: ExistingSubtask) => {
    setDeletingSubtask({
      id: subtask.id,
      subTaskNumber: subtask.subTaskNumber,
      taskName: subtask.taskName,
      subTaskCategory: subtask.subTaskCategory
    });
    setShowDeleteConfirmModal(true);
  };

  // ✅ Function ยืนยันการลบ
  const handleConfirmDelete = async () => {
    if (!deletingSubtask) return;

    setIsSaving(true);
    try {
      // หา Task ID จาก taskName
      const task = tasks.find(t => t.taskName === deletingSubtask.taskName);
      if (!task) {
        alert('ไม่พบ Task ที่เกี่ยวข้อง');
        return;
      }

      // อัพเดท subTaskStatus เป็น DELETED (Soft Delete)
      await setDoc(
        doc(db, 'tasks', task.id, 'subtasks', deletingSubtask.subTaskNumber),
        {
          subTaskStatus: 'DELETED',
          lastUpdate: Timestamp.now()
        },
        { merge: true }
      );

      console.log('✅ Soft deleted subtask:', deletingSubtask.subTaskNumber);

      // Invalidate Cache
      const cacheKey = `subtasks_projectId:${selectedProject}`;
      invalidateCache(cacheKey);

      // รีเฟรชข้อมูล
      const taskIds = tasks.map(t => t.id);
      const updatedSubtasks = await getCachedSubtasks(
        selectedProject,
        taskIds,
        getCache,
        setCache
      );
      setExistingSubtasks(updatedSubtasks);

      // ปิด Modal
      setShowDeleteConfirmModal(false);
      setDeletingSubtask(null);

      alert('ลบ Subtask สำเร็จ!');

    } catch (error) {
      console.error('❌ Error deleting subtask:', error);
      alert('เกิดข้อผิดพลาดในการลบ');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Function ยกเลิกการลบ
  const handleCancelDelete = () => {
    setShowDeleteConfirmModal(false);
    setDeletingSubtask(null);
  };

  // ✅ ตรวจสอบว่ากรอกข้อมูลครบหรือยัง
  const isEditDataValid = (): boolean => {
    if (!editingData) return false;
    
    return Boolean(
      editingData.activity &&
      editingData.relateDrawing &&
      editingData.relateWork &&
      editingData.workScale &&
      editingData.assignee
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
                      <td className="px-2 py-2 text-center">
                        <span className="text-gray-400 text-xs">-</span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-gray-400 text-xs">-</span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-gray-400 text-xs">-</span>
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

                  
{existingSubtasks.map((subtask, index) => {
  const deadlineStatus = subtask.deadlineStatus || {
    text: '-',
    bgColor: '',
    isOverdue: false
  };
  
  const isEditing = editingSubtaskId === subtask.id;
  const task = tasks.find(t => t.taskName === subtask.taskName);
  
  // ✅ ตรวจสอบว่าแถวนี้ถูกแก้ไขหรือไม่
  const isEdited = !!editedSubtasks[subtask.id];

  return (
    <tr 
      key={`existing-${subtask.subTaskNumber}-${index}`}
      className={`hover:bg-gray-50 ${deadlineStatus.bgColor} ${
        isEditing 
          ? 'bg-blue-100 border-l-4 border-blue-400' 
          : isEdited 
            ? 'bg-blue-50 border-l-4 border-blue-300' 
            : ''
      }`}
    >
      {/* SUBTASK ID - ไม่แก้ไข */}
      <td className="px-2 py-2 text-xs text-gray-900 whitespace-normal break-words">
        {subtask.subTaskNumber}
        {isEdited && (
          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            แก้ไขแล้ว
          </span>
        )}
      </td>

      {/* ACTIVITY - แก้ไขได้ */}
      <td className="px-2 py-2 text-xs">
        {isEditing ? (
          <Select
            options={uniqueCategories.map(cat => ({ value: cat, label: cat }))}
            value={editingData?.activity || ''}
            onChange={(value) => handleUpdateEditData('activity', value)}
            placeholder="Select"
          />
        ) : (
          <span className={`truncate ${isEdited ? 'text-blue-700 font-medium' : 'text-gray-900'}`} title={task?.taskCategory || ''}>
            {/* 🔧 แก้ไขตรงนี้: แสดงข้อมูลที่แก้ไขแล้ว */}
            {isEdited && editedSubtasks[subtask.id]?.activity 
              ? editedSubtasks[subtask.id].activity
              : task?.taskCategory || '-'
            }
          </span>
        )}
      </td>

      {/* RELATE DRAWING - แก้ไขได้ */}
      <td className="px-2 py-2 text-xs">
        {isEditing ? (
          <Select
            options={tasks
              .filter(t => !editingData?.activity || t.taskCategory === editingData.activity)
              .map(t => ({ value: t.id, label: t.taskName }))}
            value={editingData?.relateDrawing || ''}
            onChange={(value) => handleUpdateEditData('relateDrawing', value)}
            placeholder="Select"
            disabled={!editingData?.activity}
          />
        ) : (
          <span className={`truncate ${isEdited ? 'text-blue-700 font-medium' : 'text-gray-500'}`} title={subtask.taskName}>
            {subtask.taskName}
          </span>
        )}
      </td>

      {/* RELATE WORK - แก้ไขได้ */}
      <td className="px-2 py-2 text-xs">
        {isEditing ? (
          <RelateWorkSelect
            activityId={editingData?.activity || ''}
            value={editingData?.relateWork || ''}
            onChange={(value) => handleUpdateEditData('relateWork', value)}
            disabled={!editingData?.activity}
          />
        ) : (
          <span className={`truncate ${isEdited ? 'text-blue-700 font-medium' : 'text-gray-500'}`} title={subtask.subTaskCategory}>
            {subtask.subTaskCategory}
          </span>
        )}
      </td>

      {/* ITEM - แก้ไขได้ */}
      <td className="px-2 py-2 text-xs">
        {isEditing ? (
          <input
            type="text"
            value={editingData?.item || ''}
            onChange={(e) => handleUpdateEditData('item', e.target.value)}
            className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900 bg-white focus:outline-none focus:border-blue-500"
            placeholder="Item"
          />
        ) : (
          <span className={`truncate ${isEdited ? 'text-blue-700 font-medium' : 'text-gray-500'}`}>
            {subtask.item || '-'}
          </span>
        )}
      </td>

      {/* INTERNAL REV - แก้ไขได้ */}
      <td className="px-2 py-2 text-xs text-center">
        {isEditing ? (
          <input
            type="number"
            value={editingData?.internalRev || ''}
            onChange={(e) => handleUpdateEditData('internalRev', e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-1 py-1 border border-gray-300 rounded text-center text-xs text-gray-900 bg-white focus:outline-none focus:border-blue-500"
            min="1"
            placeholder="Rev"
          />
        ) : (
          <span className={`${isEdited ? 'text-blue-700 font-medium' : 'text-gray-500'}`}>
            {subtask.internalRev || '-'}
          </span>
        )}
      </td>

      {/* WORK SCALE - แก้ไขได้ */}
      <td className="px-2 py-2 text-xs text-center">
        {isEditing ? (
          <Select
            options={[
              { value: 'S', label: 'S' },
              { value: 'M', label: 'M' },
              { value: 'L', label: 'L' }
            ]}
            value={editingData?.workScale || ''}
            onChange={(value) => handleUpdateEditData('workScale', value)}
          />
        ) : (
          <span className={`${isEdited ? 'text-blue-700 font-medium' : 'text-gray-500'}`}>
            {subtask.subTaskScale}
          </span>
        )}
      </td>

      {/* ASSIGNEE - แก้ไขได้ */}
      <td className="px-2 py-2">
        {isEditing ? (
          <AssigneeSelect
            value={editingData?.assignee || ''}
            onChange={(value) => handleUpdateEditData('assignee', value)}
          />
        ) : (
          <div className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              isEdited ? 'bg-blue-600' : 'bg-blue-500'
            }`}>
              <span className="text-xs font-medium text-white">
                {subtask.subTaskAssignee?.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className={`text-xs ${isEdited ? 'text-blue-700 font-medium' : 'text-gray-900'}`}>
              {subtask.subTaskAssignee}
            </span>
          </div>
        )}
      </td>

      {/* DEADLINE - ไม่แก้ไข */}
      <td className="px-2 py-2 text-xs">
        <span className={`font-medium ${
          deadlineStatus.isOverdue ? 'text-red-600' : 
          deadlineStatus.bgColor === 'bg-yellow-50' ? 'text-yellow-700' : 
          'text-gray-700'
        }`}>
          {deadlineStatus.text}
        </span>
      </td>

      {/* PROGRESS - ไม่แก้ไข */}
      <td className="px-2 py-2">
        <ProgressBar value={subtask.subTaskProgress} size="sm" />
      </td>

      {/* LINK FILE - ไม่แก้ไข */}
      <td className="px-2 py-2 text-center">
        {subtask.subTaskFiles && 
         subtask.subTaskFiles.length > 0 && 
         subtask.subTaskFiles[0] && 
         typeof subtask.subTaskFiles[0] === 'object' &&
         subtask.subTaskFiles[0].fileName &&
         subtask.subTaskFiles[0].fileUrl ? (
          <button
            onClick={() => handleOpenFile(subtask.subTaskFiles![0])}
            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors border border-blue-200 flex items-center gap-1 mx-auto"
          >
            📎 
          </button>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </td>

      {/* CORRECT - ปุ่ม Edit/Save/Cancel/Delete */}
      <td className="px-2 py-2">
        <div className="flex items-center justify-center space-x-1">
          {isEditing ? (
            <>
              {/* ปุ่ม Save (เครื่องหมายถูก) */}
              <button 
                onClick={handleSaveEditToState}
                disabled={!isEditDataValid()}
                className={`p-1 transition-colors ${
                  isEditDataValid()
                    ? 'text-green-600 hover:text-green-800 cursor-pointer'
                    : 'text-gray-300 cursor-not-allowed'
                }`}
                title="Save to state"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <span className="text-gray-300">|</span>
              {/* ปุ่ม Cancel (เครื่องหมายผิด) */}
              <button 
                onClick={handleCancelEdit}
                className="p-1 text-red-600 hover:text-red-800 transition-colors"
                title="Cancel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          ) : (
            <>
              {/* ปุ่ม Edit */}
              <button 
                onClick={() => handleStartEdit(subtask)}
                className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                title="Edit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <span className="text-gray-300">|</span>
              {/* ปุ่ม Delete */}
              {/* ปุ่ม Delete */}
            <button 
              onClick={() => handlePrepareDelete(subtask)}
              className="p-1 text-gray-600 hover:text-red-600 transition-colors"
              title="Delete"
              disabled={isEditing}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
              <div className="text-sm text-yellow-600">รายการใหม่</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-800">
                {Object.keys(editedSubtasks).length}
              </div>
              <div className="text-sm text-blue-600">รายการแก้ไข</div>
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
                {/* รายการใหม่ */}
                {getValidRows().map((row, index) => (
                  <tr key={`new-${index}`}>
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
                
                {/* รายการแก้ไข */}
                {Object.values(editedSubtasks).map((subtask, index) => (
                  <tr key={`edited-${index}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        แก้ไข
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {tasks.find(t => t.taskName === subtask.taskName)?.taskCategory || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{subtask.taskName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{subtask.subTaskCategory}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{subtask.item || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{subtask.subTaskScale}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{subtask.subTaskAssignee}</td>
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

      {/* ✅ Edit Confirmation Modal */}
      <Modal
        isOpen={showEditConfirmModal}
        onClose={() => setShowEditConfirmModal(false)}
        title="ยืนยันการแก้ไขข้อมูล"
        size="xl"
        footer={
          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={() => setShowEditConfirmModal(false)}
              disabled={isSaving}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleConfirmEditSave}
              disabled={isSaving}
            >
              {isSaving ? 'กำลังบันทึก...' : 'ยืนยันการแก้ไข'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">กรุณาตรวจสอบข้อมูลก่อนบันทึก</p>
          
          {/* สถิติ */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-800">1</div>
              <div className="text-sm text-blue-600">รายการที่แก้ไข</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-yellow-800">แก้ไข</div>
              <div className="text-sm text-yellow-600">ประเภท</div>
            </div>
          </div>

          {/* ตารางข้อมูล */}
          {editConfirmData && (
            <div className="overflow-x-auto max-h-96 border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ประเภท</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtask ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Relate Drawing</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Relate Work</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Internal Rev</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Scale</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignee</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        แก้ไข
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{editConfirmData.subtaskNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{editConfirmData.activity}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{editConfirmData.relateDrawing}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{editConfirmData.relateWork}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{editConfirmData.item}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{editConfirmData.internalRev}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{editConfirmData.workScale}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{editConfirmData.assignee}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

            {/* ✅ Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirmModal}
        onClose={handleCancelDelete}
        title="ยืนยันการลบ Subtask"
        size="md"
        footer={
          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={handleCancelDelete}
              disabled={isSaving}
            >
              ยกเลิก
            </Button>
            <Button 
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={isSaving}
            >
              {isSaving ? 'กำลังลบ...' : 'ยืนยันการลบ'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* ⚠️ Warning Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          {/* ข้อความเตือน */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              คุณต้องการลบ Subtask นี้หรือไม่?
            </h3>
            <p className="text-sm text-gray-600">
              การลบจะไม่สามารถกู้คืนได้
            </p>
          </div>

          {/* รายละเอียด Subtask */}
          {deletingSubtask && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Subtask ID:</span>
                  <span className="text-sm text-gray-900">{deletingSubtask.subTaskNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Task Name:</span>
                  <span className="text-sm text-gray-900">{deletingSubtask.taskName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Category:</span>
                  <span className="text-sm text-gray-900">{deletingSubtask.subTaskCategory}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ✅ Modal แสดงไฟล์ PDF */}
      <Modal
        isOpen={showFileModal}
        onClose={() => {
          setShowFileModal(false);
          setSelectedFile(null);
        }}
        title={selectedFile?.fileName || 'File Viewer'}
        size="xl"
        footer={
          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowFileModal(false);
                setSelectedFile(null);
              }}
            >
              Close
            </Button>
            {selectedFile && (
              <a
                href={selectedFile.fileUrl}
                download={selectedFile.fileName}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button>
                  ⬇️ Download
                </Button>
              </a>
            )}
          </div>
        }
      >
        {selectedFile && (
          <div className="w-full h-[70vh]">
            <iframe
              src={selectedFile.fileUrl}
              className="w-full h-full border-0 rounded"
              title={selectedFile.fileName}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}