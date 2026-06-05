'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, setDoc, doc, Timestamp, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/shared/Navbar';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import Modal from '@/components/ui/Modal';
import SuccessModal from '@/components/ui/SuccessModal';
import ErrorModal from '@/components/modals/ErrorModal';
import RelateWorkSelect from './components/RelateWorkSelect';
import AssigneeSelect from './components/AssigneeSelect';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { useCache } from '@/context/CacheContext';
import { calculateDeadlineStatus } from '@/utils/deadlineCalculator';
import { uploadTaskEditAttachment } from '@/services/uploadService';
import LoadingOverlay from '@/components/LoadingOverlay';
import { checkTaskHasDailyReports } from '@/services/taskService'; // [T-021] Import Deletion Guard
import { getCachedSubtasks } from '@/services/cachedFirestoreService'; // [T-005-E6] Fix ReferenceError

interface TaskItem {
  id: string;
  taskName: string;
  taskCategory: string;
  taskStatus?: string; // ✅ ต้องมี field นี้
  status?: string; // ✅ Add status field for compatibility
  dueDate?: any;
  currentStep?: string;
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

type EditChange = {
  field: string;
  label: string;
  before: string;
  after: string;
};

// ✅ โค้ดใหม่
interface ExistingSubtask {
  id: string;
  taskId?: string; // ✅ Add taskId matching service
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
  latestDailyReportFileURL?: string;
  latestDailyReportFileName?: string;
  // 🔧 เพิ่มข้อมูลเหล่านี้
  activity?: string;
  relateDrawing?: string;
  _isEdited?: boolean; // ✅ เพิ่มบรรทัดนี้
}

export default function TaskAssignment() {
  const { appUser } = useAuth();
  const {
    projects,
    fetchProjects,
    tasks: tasksCache,
    fetchTasksForProject,
    getCache,
    setCache,
    invalidateCache
  } = useCache();

  // const [projects, setProjects] = useState<any[]>([]); // Derived from cache
  const [selectedProject, setSelectedProject] = useState('all_assign');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [existingSubtasks, setExistingSubtasks] = useState<ExistingSubtask[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successNewCount, setSuccessNewCount] = useState(0);
  const [successUpdateCount, setSuccessUpdateCount] = useState(0);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
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
    taskId?: string; // ✅ Add taskId
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
    internalRev: number | null;
    workScale: string;
    assignee: string;
  } | null>(null);

  // ✅ New State: Filtering & Sorting
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterDateRange, setFilterDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // ✅ เพิ่ม State สำหรับ Edit Mode
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<{
    activity: string;
    relateDrawing: string;
    relateDrawingName: string;
    relateWork: string;
    item: string | null;
    internalRev: number | null;
    workScale: string;
    assignee: string;
  } | null>(null);
  const [editChangedFields, setEditChangedFields] = useState<EditChange[]>([]);
  const [editNote, setEditNote] = useState('');
  const [editAttachment, setEditAttachment] = useState<File | null>(null);
  const [editAttachmentError, setEditAttachmentError] = useState<string | null>(null);

  // ✅ เพิ่ม State สำหรับเก็บข้อมูลที่แก้ไขแล้ว (ยังไม่บันทึกลงฐานข้อมูล)
  const [editedSubtasks, setEditedSubtasks] = useState<{ [key: string]: any }>({});

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
        // ❌ ไม่อัพเดท activity - คงค่าเดิมไว้
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
        ...existingSubtasks.find(s => s.id === editingSubtaskId),
        id: editingSubtaskId,
        subTaskNumber: existingSubtasks.find(s => s.id === editingSubtaskId)?.subTaskNumber || '',
        taskName: editingData.relateDrawingName,
        subTaskCategory: editingData.relateWork,
        item: editingData.item || '',
        internalRev: editingData.internalRev ? String(editingData.internalRev) : '',
        subTaskScale: editingData.workScale,
        subTaskAssignee: editingData.assignee,
        // ❌ ไม่รวม activity ในข้อมูลที่แก้ไข
        // activity: editingData.activity, // ลบบรรทัดนี้ออก
        relateDrawing: editingData.relateDrawing,
        _isEdited: true
      }
    }));

    // ออกจาก Edit Mode
    handleCancelEdit();
  };

  // ✅ Fetch Projects via Cache
  useEffect(() => {
    const loadProjects = async () => {
      if (projects.length > 0) return;
      setLoading(true);
      try {
        await fetchProjects();
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, [fetchProjects, projects.length]);

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

      setLoading(true); // T-020: Start loading

      try {
        // ✅ 4. โค้ดส่วนที่แก้ไขสำหรับการดึงข้อมูล "All Assign" หรือ "Project" ปกติ
        // ✅ 4. โค้ดส่วนที่แก้ไขสำหรับการดึงข้อมูล "All Assign" หรือ "Project" ปกติ
        if (selectedProject === 'all_assign') {
          if (!appUser) return; // ✅ รอให้ User Login เสร็จก่อน

          try {
            console.log('🌍 Fetching ALL ASSIGNED tasks for user:', appUser?.fullName);

            // ✅ Use Optimized Service with Collection Group Query
            const { fetchAssignedSubtasks } = await import('@/services/taskAssignService');

            // Name matching logic
            const fullName = appUser.fullName || '';
            const username = appUser.username || '';

            console.log(`👤 [T-045] Current User Identity: FullName="${fullName}", Username="${username}"`);

            // Priority 1: Full Name
            let subtasks = await fetchAssignedSubtasks(fullName);

            // Priority 2: Username (if different and priority 1 returned nothing)
            if (subtasks.length === 0 && username && username !== fullName) {
              console.log(`⚠️ [T-045] No tasks found for FullName. Trying Username: "${username}"...`);
              const subtasksByUsername = await fetchAssignedSubtasks(username);
              if (subtasksByUsername.length > 0) {
                console.log(`✅ [T-045] Found tasks using Username!`);
                subtasks = subtasksByUsername;
              }
            }

            if (subtasks.length === 0) {
              console.log("ℹ️ No assigned tasks found for user.");
              setExistingSubtasks(subtasks as ExistingSubtask[]);
            } else {
              // Fetch parent tasks to get Activity (taskCategory) and DueDate
              const uniqueTaskIds = Array.from(new Set(subtasks.map(s => s.taskId).filter(id => id && id.trim() !== '')));
              const fetchedTasks: TaskItem[] = [];

              if (uniqueTaskIds.length > 0) {
                const tasksCol = collection(db, 'tasks');
                const chunks = [];
                for (let i = 0; i < uniqueTaskIds.length; i += 10) {
                  chunks.push(uniqueTaskIds.slice(i, i + 10));
                }

                for (const chunk of chunks) {
                  // Use documentId() which is '__name__'
                  // Fix: Firestore 'in' query must not exceed 10. `chunks` does this safely.
                  const { documentId } = await import('firebase/firestore');
                  const chunkQuery = query(tasksCol, where(documentId(), 'in', chunk));
                  const snap = await getDocs(chunkQuery);

                  snap.docs.forEach(doc => {
                    const data = doc.data();
                    const rawTaskStatus = data.taskStatus;
                    const rawStatus = data.status;
                    const taskStatus = (rawTaskStatus || '').toString().trim().toUpperCase();
                    const status = (rawStatus || '').toString().trim().toUpperCase();

                    if (taskStatus !== 'DELETED' && status !== 'DELETED') {
                      fetchedTasks.push({
                        id: doc.id,
                        taskName: data.taskName || '',
                        taskCategory: data.taskCategory || '',
                        taskStatus: data.taskStatus,
                        status: data.status,
                        dueDate: data.dueDate || null,
                        currentStep: data.currentStep || null
                      });
                    }
                  });
                }
              }

              setTasks(fetchedTasks);

              // Calculate deadline status exactly like project branch
              const subtasksWithDeadline = subtasks.map(subtask => {
                const task = fetchedTasks.find(t => t.id === subtask.taskId);
                if (!task || !task.dueDate) {
                  return {
                    ...subtask,
                    deadlineStatus: { text: '-', bgColor: '', isOverdue: false }
                  };
                }

                return {
                  ...subtask,
                  deadlineStatus: calculateDeadlineStatus(
                    subtask.subTaskProgress,
                    task.dueDate,
                    subtask.endDate
                  )
                };
              });

              setExistingSubtasks(subtasksWithDeadline as ExistingSubtask[]);
            }

            // T-005-EX-1: Set Empty Row (Hide New Input) for All Assign mode
            setRows([]);

          } catch (error) {
            console.error('Error fetching all assigned tasks:', error);
            setErrorMessage('เกิดข้อผิดพลาดในการดึงงานทั้งหมด');
            setShowErrorModal(true);
          } finally {
            setLoading(false);
          }
          return; // Add return to prevent executing single project logic
        }
        // ✅ 1. โหลด Tasks (where ตัวเดียว - ไม่ต้อง Index)
        const tasksCol = collection(db, 'tasks');
        const q = query(tasksCol, where('projectId', '==', selectedProject));
        const tasksSnapshot = await getDocs(q);

        // ✅ 2. กรองใน JavaScript (Strict Filtering for DELETED)
        const taskList = tasksSnapshot.docs
          .filter(doc => {
            const data = doc.data();
            const rawTaskStatus = data.taskStatus;
            const rawStatus = data.status;

            // Normalize values
            const taskStatus = (rawTaskStatus || '').toString().trim().toUpperCase();
            const status = (rawStatus || '').toString().trim().toUpperCase();

            // [T-005-E11-1] Debug Log for Deletion Check
            const isDeleted = taskStatus === 'DELETED' || status === 'DELETED';

            if (isDeleted) {
              console.warn(`[T-005-E11-1] 🗑️ Filtered out DELETED task: ${doc.id} (${data.taskName}) | taskStatus: ${rawTaskStatus} | status: ${rawStatus}`);
              return false;
            }

            // Optional: Log active tasks for verification
            // console.log(`✅ Keeping Task: ${doc.id} | Status: ${taskStatus}`);
            return true;
          })
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              taskName: data.taskName || '',
              taskCategory: data.taskCategory || '',
              taskStatus: data.taskStatus, // ✅ Populate field
              status: data.status,         // ✅ Populate field
              dueDate: data.dueDate || null,
              currentStep: data.currentStep || null
            };
          });

        setTasks(taskList);

        // ✅ 3. โหลด Subtasks
        const taskIds = taskList.map(t => t.id);

        console.log('📊 Loading subtasks for', taskIds.length, 'tasks');

        const allSubtasks = await getCachedSubtasks(selectedProject, taskIds, getCache, setCache);

        // ✅ 4. คำนวณ Deadline Status
        const subtasksWithDeadline = allSubtasks.map(subtask => {
          // ✅ Use taskId lookup
          const task = subtask.taskId
            ? taskList.find(t => t.id === subtask.taskId)
            : taskList.find(t => t.taskName === subtask.taskName);

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
      } finally {
        setLoading(false); // T-020: Stop loading
      }
    };

    fetchProjectData();
  }, [selectedProject, appUser]);

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

      // [T-005-E12] Auto-Add Row Logic (Top Row Implementation)
      // When the top row (Index 0) is filled with key fields, prepend a new empty row.
      if (rowIndex === 0) {
        if (updatedRow.activity && updatedRow.relateDrawing && updatedRow.relateWork && updatedRow.assignee) {
          console.log('[T-005-E12] Auto-adding new row at TOP...');
          const newEmptyRow: SubtaskRow = {
            id: Date.now().toString(),
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
          };
          return [newEmptyRow, ...newRows];
        }
      }

      console.log('✅ Updated row:', {
        id: updatedRow.id,
        activity: updatedRow.activity,
        relateDrawing: updatedRow.relateDrawingName,
        relateWork: updatedRow.relateWork,
        assignee: updatedRow.assignee
      });



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

    // --- 3. แก้ไข Alert ---
    if (!hasNewItems && !hasEditedItems) {
      setErrorMessage('กรุณากรอกข้อมูลใหม่หรือแก้ไขข้อมูลเดิมอย่างน้อย 1 รายการ');
      setShowErrorModal(true);
      return;
    }

    if (!validation.valid && hasNewItems) {
      setErrorMessage(validation.message || 'ข้อมูลไม่ถูกต้อง');
      setShowErrorModal(true);
      return;
    }
    // --------------------

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
      // [T-028] Normalize taskNumber to uppercase
      const taskNumber = taskDoc.data()?.taskNumber?.toUpperCase();

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

      // [T-028] Ensure final subtask ID is uppercase
      return `${taskNumber}-${paddedNumber}`.toUpperCase();
    } catch (error) {
      console.error('Error generating subtask number:', error);
      return null;
    }
  };

  // ✅ Filtering & Sorting Logic
  const getFilteredAndSortedSubtasks = () => {
    let result = [...existingSubtasks];

    // 1. Filter by Assignee
    if (filterAssignee) {
      result = result.filter(subtask => subtask.subTaskAssignee === filterAssignee);
    }

    // 2. Filter by Date Range (Due Date / End Date)
    if (filterDateRange.start || filterDateRange.end) {
      result = result.filter(subtask => {
        // ✅ Use taskId if available, fallback to name
        const task = subtask.taskId
          ? tasks.find(t => t.id === subtask.taskId)
          : tasks.find(t => t.taskName === subtask.taskName);
        // Priority: Subtask.endDate > Task.dueDate
        const dateToCheck = subtask.endDate || task?.dueDate;

        if (!dateToCheck) return false;

        const checkDate = dateToCheck instanceof Timestamp
          ? dateToCheck.toDate().getTime()
          : new Date(dateToCheck.seconds * 1000).getTime();

        const startDate = filterDateRange.start ? new Date(filterDateRange.start).getTime() : -Infinity;
        // End date needs to be end of day
        const endDate = filterDateRange.end ? new Date(filterDateRange.end).setHours(23, 59, 59, 999) : Infinity;

        return checkDate >= startDate && checkDate <= endDate;
      });
    }

    // 3. Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: any = '';
        let bValue: any = '';

        switch (sortConfig.key) {
          case 'subTaskNumber':
            aValue = a.subTaskNumber;
            bValue = b.subTaskNumber;
            break;
          case 'activity':
            // Activity logic is complex, grabbing from edited or task
            const taskA = a.taskId ? tasks.find(t => t.id === a.taskId) : tasks.find(t => t.taskName === a.taskName);
            const taskB = b.taskId ? tasks.find(t => t.id === b.taskId) : tasks.find(t => t.taskName === b.taskName);
            aValue = editedSubtasks[a.id]?.activity || taskA?.taskCategory || '';
            bValue = editedSubtasks[b.id]?.activity || taskB?.taskCategory || '';
            break;
          case 'subTaskAssignee':
            aValue = a.subTaskAssignee || '';
            bValue = b.subTaskAssignee || '';
            break;
          case 'dueDate':
            const taskRefA = a.taskId ? tasks.find(t => t.id === a.taskId) : tasks.find(t => t.taskName === a.taskName);
            const taskRefB = b.taskId ? tasks.find(t => t.id === b.taskId) : tasks.find(t => t.taskName === b.taskName);
            const dateA = a.endDate || taskRefA?.dueDate;
            const dateB = b.endDate || taskRefB?.dueDate;
            aValue = dateA?.seconds || 0;
            bValue = dateB?.seconds || 0;
            break;
          // Add other cases as needed
          default:
            return 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  };

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // ✅ Get Unique Assignees for Dropdown
  const uniqueAssignees = useMemo(() => {
    const assignees = new Set<string>();
    existingSubtasks.forEach(task => {
      if (task.subTaskAssignee) assignees.add(task.subTaskAssignee);
    });
    return Array.from(assignees).sort();
  }, [existingSubtasks]);

  // ✅ Function สำหรับลบ Task
  const handleDeleteTask = async (taskId: string) => {
    // [T-021] Pre-check: ตรวจสอบว่ามี Daily Report หรือไม่
    try {
      const hasReports = await checkTaskHasDailyReports(taskId);
      if (hasReports) {
        setErrorMessage('ไม่สามารถลบงานนี้ได้ เนื่องจากมีการลงเวลาทำงาน (Daily Report) แล้ว');
        setShowErrorModal(true);
        return;
      }
    } catch (error) {
      console.error('Error checking task usage:', error);
      setErrorMessage('เกิดข้อผิดพลาดในการตรวจสอบข้อมูลงาน');
      setShowErrorModal(true);
      return;
    }

    // confirm() เป็น pop-up สำหรับ "ยืนยัน" ไม่ใช่ "แจ้งเตือน" จะคงไว้ตามเดิม
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

      // Invalidate Cache ทันที
      const cacheKey = `tasks_projectId:${selectedProject}`;
      invalidateCache(cacheKey);

      // --- Reload ข้อมูล (โค้ดส่วนนี้เหมือนเดิม) ---
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

      setSuccessMessage('ลบ Task สำเร็จ!');
      setShowSuccessModal(true);

      // [T-053] Invalidate Project Tasks Cache
      if (selectedProject) {
        invalidateCache(`tasks_${selectedProject}`);
      }
      // ------------------------------------

    } catch (error) {
      console.error('Error deleting task:', error);
      // --- ส่วนที่แก้ไข: เรียกใช้ ErrorModal ---
      setErrorMessage('เกิดข้อผิดพลาดในการลบ Task');
      setShowErrorModal(true);
      // -----------------------------------
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

      // แก้ไขการบันทึกรายการที่แก้ไข
      for (const editedSubtask of editedItems) {
        const originalSubtask = existingSubtasks.find(s => s.id === editedSubtask.id);
        if (!originalSubtask) {
          console.warn('ไม่พบ originalSubtask สำหรับ:', editedSubtask.id);
          continue;
        }

        const taskId = editedSubtask.relateDrawing;

        if (!taskId) {
          console.warn('ไม่มี taskId สำหรับ subtask:', editedSubtask.id);
          continue;
        }

        const docPath = `tasks/${taskId}/subtasks/${originalSubtask.subTaskNumber}`;
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
          await setDoc(
            doc(db, 'tasks', taskId, 'subtasks', originalSubtask.subTaskNumber),
            docData,
            { merge: true }
          );
        } catch (docError) {
          console.error('❌ เกิดข้อผิดพลาดในการบันทึก editedSubtask:', docError);
          throw docError;
        }
      }

      const newItemsCount = rowsToSave.length;
      const updateItemsCount = editedItems.length;

      invalidateCache(`subtasks_projectId:${selectedProject}`);

      setShowConfirmModal(false);

      setRows([{
        id: '1', subtaskId: '', relateDrawing: '', relateDrawingName: '', activity: '',
        relateWork: '', item: '', internalRev: null, workScale: 'S',
        assignee: '', deadline: '', progress: 0
      }]);

      setEditedSubtasks({});

      setSuccessNewCount(newItemsCount);
      setSuccessUpdateCount(updateItemsCount);
      setShowSuccessModal(true);

      // [T-053] Invalidate Project Tasks Cache to update Subtask Counts in Project Planning
      if (selectedProject) {
        invalidateCache(`tasks_${selectedProject}`);
      }

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
      // --- ส่วนที่แก้ไข: เรียกใช้ ErrorModal ---
      setErrorMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + errorMessage);
      setShowErrorModal(true);
      // ------------------------------------
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
    // ✅ Use taskId lookup
    const task = subtask.taskId
      ? tasks.find(t => t.id === subtask.taskId)
      : tasks.find(t => t.taskName === subtask.taskName);

    setEditingSubtaskId(subtask.id);
    setEditingData({
      // ✅ ใส่ค่า activity เพื่อให้ Relate Work ใช้งานได้
      activity: task?.taskCategory || '',
      relateDrawing: task?.id || '', // Use found task ID
      relateDrawingName: subtask.taskName,
      relateWork: subtask.subTaskCategory,
      item: subtask.item || '',
      internalRev: subtask.internalRev ? parseInt(subtask.internalRev) : null,
      workScale: subtask.subTaskScale,
      assignee: subtask.subTaskAssignee
    });
    setEditChangedFields([]);
    setEditNote('');
    setEditAttachment(null);
    setEditAttachmentError(null);
  };

  // ✅ Function ยกเลิก Edit
  const handleCancelEdit = () => {
    setEditingSubtaskId(null);
    setEditingData(null);
    setEditChangedFields([]);
    setEditNote('');
    setEditAttachment(null);
    setEditAttachmentError(null);
  };

  // ✅ Function อัพเดทข้อมูลใน Edit Mode
  const handleUpdateEditData = (field: string, value: any) => {
    if (!editingData) return;

    // ✅ เพิ่มการตรวจสอบ: ถ้าพยายามแก้ไข activity หรือ relateDrawing ให้ return ทันที
    if (field === 'activity' || field === 'relateDrawing') {
      console.warn(`Cannot edit ${field} field - it is locked`);
      return;
    }

    setEditingData(prev => {
      if (!prev) return prev;

      const updated = { ...prev, [field]: value };

      // ❌ ลบการรีเซ็ตออก เพราะ activity และ relateDrawing ไม่เปลี่ยนแปลง

      return updated;
    });
  };

  const handleEditAttachmentChange = (file: File | null) => {
    if (!file) {
      setEditAttachment(null);
      setEditAttachmentError(null);
      return;
    }

    const maxSizeMb = 25;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setEditAttachmentError(`ขนาดไฟล์ต้องไม่เกิน ${maxSizeMb}MB`);
      setEditAttachment(null);
      return;
    }

    setEditAttachment(file);
    setEditAttachmentError(null);
  };

  const computeEditChanges = (subtask: ExistingSubtask, editData: {
    relateWork: string;
    item: string | null;
    internalRev: number | null;
    workScale: string;
    assignee: string;
  }): EditChange[] => {
    const changes: EditChange[] = [];

    const addChange = (field: string, label: string, beforeValue: string | number | null | undefined, afterValue: string | number | null | undefined) => {
      const before = (beforeValue ?? '').toString().trim();
      const after = (afterValue ?? '').toString().trim();
      if (before !== after) {
        changes.push({ field, label, before: before || '-', after: after || '-' });
      }
    };

    addChange('relateWork', 'Relate Work', subtask.subTaskCategory, editData.relateWork);
    addChange('item', 'Item', subtask.item, editData.item);
    const subtaskInternalRev = subtask.internalRev ? parseInt(subtask.internalRev) : null;
    addChange('internalRev', 'Internal Rev.', subtaskInternalRev, editData.internalRev);
    addChange('workScale', 'Work Scale', subtask.subTaskScale, editData.workScale);
    addChange('assignee', 'Assignee', subtask.subTaskAssignee, editData.assignee);

    return changes;
  };

  // ✅ Function เตรียมข้อมูลสำหรับ Confirmation
  const handlePrepareEditConfirm = () => {
    if (!editingSubtaskId || !editingData) return;

    const subtask = existingSubtasks.find(s => s.id === editingSubtaskId);
    if (!subtask) return;

    setEditChangedFields(
      computeEditChanges(subtask, {
        relateWork: editingData.relateWork,
        item: editingData.item,
        internalRev: editingData.internalRev,
        workScale: editingData.workScale,
        assignee: editingData.assignee,
      })
    );

    setEditConfirmData({
      subtaskNumber: subtask.subTaskNumber,
      activity: editingData.activity,
      relateDrawing: editingData.relateDrawingName,
      relateWork: editingData.relateWork,
      item: editingData.item || '-',
      internalRev: editingData.internalRev ?? null,
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

      const taskId = editingData.relateDrawing;
      const changes: EditChange[] = editChangedFields.length
        ? editChangedFields
        : computeEditChanges(subtask, {
          relateWork: editingData.relateWork,
          item: editingData.item,
          internalRev: editingData.internalRev,
          workScale: editingData.workScale,
          assignee: editingData.assignee,
        });

      // บันทึกลง Firestore
      await setDoc(
        doc(db, 'tasks', taskId, 'subtasks', subtask.subTaskNumber),
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

      let attachmentInfo: { cdnURL: string; storagePath: string; fileUploadedAt: Timestamp; fileName: string } | null = null;
      if (editAttachment) {
        attachmentInfo = await uploadTaskEditAttachment(editAttachment, taskId);
      }

      const editorName = appUser?.fullName || appUser?.username || appUser?.employeeId || 'unknown';
      const historyEntry: any = {
        timestamp: Timestamp.now(),
        fields: changes,
        note: editNote.trim(),
        subtaskNumber: subtask.subTaskNumber,
        subtaskPath: `tasks/${taskId}/subtasks/${subtask.subTaskNumber}`,
        user: editorName,
      };

      if (attachmentInfo) {
        historyEntry.fileURL = attachmentInfo.cdnURL;
        historyEntry.storagePath = attachmentInfo.storagePath;
        historyEntry.fileName = attachmentInfo.fileName;
        historyEntry.fileUploadedAt = attachmentInfo.fileUploadedAt;
      }

      try {
        await updateDoc(doc(db, 'tasks', taskId), {
          editHistory: arrayUnion(historyEntry),
        });
      } catch (historyError) {
        console.warn('Failed to append edit history via updateDoc, retrying with setDoc merge', historyError);
        await setDoc(
          doc(db, 'tasks', taskId),
          { editHistory: [historyEntry] },
          { merge: true }
        );
      }

      // Invalidate Cache
      invalidateCache(`subtasks_projectId:${selectedProject}`);

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
      setEditNote('');
      setEditAttachment(null);
      setEditAttachmentError(null);
      setEditChangedFields([]);

      // แสดง Success Modal
      setSuccessNewCount(0);
      setSuccessUpdateCount(1);
      setShowSuccessModal(true);

    } catch (error) {
      console.error('Error saving edit:', error);
      // --- ส่วนที่แก้ไข: เรียกใช้ ErrorModal ---
      setErrorMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูลที่แก้ไข');
      setShowErrorModal(true);
      // -----------------------------------
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Function เตรียมลบ Subtask
  const handlePrepareDelete = (subtask: ExistingSubtask) => {
    setDeletingSubtask({
      id: subtask.id,
      taskId: subtask.taskId, // ✅ Store taskId
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
      // หา Task ID จาก taskId (ถ้ามี) หรือ taskName
      const task = deletingSubtask.taskId
        ? tasks.find(t => t.id === deletingSubtask.taskId)
        : tasks.find(t => t.taskName === deletingSubtask.taskName);

      if (!task) {
        // --- ส่วนที่แก้ไข: เรียกใช้ ErrorModal ---
        setErrorMessage('ไม่พบ Task ที่เกี่ยวข้องกับ Subtask นี้');
        setShowErrorModal(true);
        // -----------------------------------
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
      invalidateCache(`subtasks_projectId:${selectedProject}`);

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

      // --- ส่วนที่แก้ไข: เรียกใช้ SuccessModal ---
      setSuccessMessage('ลบ Subtask สำเร็จ!');
      setShowSuccessModal(true);
      // ------------------------------------

    } catch (error) {
      console.error('❌ Error deleting subtask:', error);
      // --- ส่วนที่แก้ไข: เรียกใช้ ErrorModal ---
      setErrorMessage('เกิดข้อผิดพลาดในการลบ Subtask');
      setShowErrorModal(true);
      // -----------------------------------
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
      // หา Task ที่ taskId ตรงกับ subtask.taskId (หรือ fallback ไป taskName)
      const task = subtask.taskId
        ? tasksList.find(t => t.id === subtask.taskId)
        : tasksList.find(t => t.taskName === subtask.taskName);

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
      <LoadingOverlay isLoading={loading} message="กำลังโหลดข้อมูลงาน..." />
      <Navbar />

      <div className="flex-1 flex flex-col px-4 py-6 overflow-hidden">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 mt-4">Task Assignment</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Project & Filter</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Project Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name
              </label>
              <Select
                options={[
                  { value: 'all_assign', label: '⭐ All Assign (งานของฉันทั้งหมด)' },
                  ...projects.map(p => ({ value: p.id, label: p.name }))
                ]}
                value={selectedProject}
                onChange={handleProjectChange}
                placeholder="Select Project"
                loading={loading}
              />
            </div>

            {/* 2. Assignee Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Assignee
              </label>
              <Select
                options={[
                  { value: '', label: 'All Assignees' },
                  ...uniqueAssignees.map(a => ({ value: a, label: a }))
                ]}
                value={filterAssignee}
                onChange={setFilterAssignee}
                placeholder="All Assignees"
                disabled={uniqueAssignees.length === 0}
              />
            </div>

            {/* 3. Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                  value={filterDateRange.start}
                  onChange={(e) => setFilterDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
                <span className="text-gray-500 self-center">-</span>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                  value={filterDateRange.end}
                  onChange={(e) => setFilterDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
          </div>
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
                    <th
                      className="w-[10%] px-2 py-3 text-left text-xs font-semibold text-white uppercase cursor-pointer hover:bg-orange-700"
                      onClick={() => handleSort('subTaskNumber')}
                    >
                      Subtask ID {sortConfig?.key === 'subTaskNumber' && (sortConfig.direction === 'asc' ? '🔼' : '🔽')}
                    </th>
                    <th
                      className="w-[15%] px-2 py-3 text-left text-xs font-semibold text-white uppercase cursor-pointer hover:bg-orange-700"
                      onClick={() => handleSort('activity')}
                    >
                      Activity {sortConfig?.key === 'activity' && (sortConfig.direction === 'asc' ? '🔼' : '🔽')}
                    </th>
                    <th className="w-[20%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Relate Drawing</th>
                    <th className="w-[12%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Relate Work</th>
                    <th className="w-[8%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Item</th>
                    <th className="w-[5%] px-2 py-3 text-center text-xs font-semibold text-white uppercase">Internal Rev.</th>
                    <th className="w-[5%] px-2 py-3 text-center text-xs font-semibold text-white uppercase">Work Scale</th>
                    <th
                      className="w-[10%] px-2 py-3 text-left text-xs font-semibold text-white uppercase cursor-pointer hover:bg-orange-700"
                      onClick={() => handleSort('subTaskAssignee')}
                    >
                      Assignee {sortConfig?.key === 'subTaskAssignee' && (sortConfig.direction === 'asc' ? '🔼' : '🔽')}
                    </th>
                    {/* ✅ New Due Date Column Header */}
                    <th
                      className="w-[8%] px-2 py-3 text-left text-xs font-semibold text-white uppercase cursor-pointer hover:bg-orange-700"
                      onClick={() => handleSort('dueDate')}
                    >
                      Due Date {sortConfig?.key === 'dueDate' && (sortConfig.direction === 'asc' ? '🔼' : '🔽')}
                    </th>
                    <th className="w-[8%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Deadline</th>
                    <th className="w-[10%] px-2 py-3 text-left text-xs font-semibold text-white uppercase">Progress</th>
                    <th className="w-[6%] px-2 py-3 text-center text-xs font-semibold text-white uppercase">Link File</th>
                    <th className="w-[4%] px-2 py-3 text-center text-xs font-semibold text-white uppercase">Correct</th>
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
                        <SearchableSelect
                          options={tasks
                            .filter(t => {
                              const rawTaskStatus = t.taskStatus || '';
                              const rawStatus = t.status || '';
                              const isDeleted = rawTaskStatus.toString().trim().toUpperCase() === 'DELETED' || rawStatus.toString().trim().toUpperCase() === 'DELETED';
                              
                              const currentStep = (t.currentStep || '').toString().toUpperCase();
                              const hideSteps = [
                                'REJECTED',
                                'PENDING_CM_APPROVAL',
                                'APPROVED',
                                'APPROVED_WITH_COMMENTS',
                                'APPROVED_REVISION_REQUIRED'
                              ];
                              const isHiddenStep = hideSteps.includes(currentStep);

                              return !isDeleted && !isHiddenStep && (!row.activity || t.taskCategory === row.activity);
                            })
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
                            projectName={projects.find(p => p.id === selectedProject)?.name || ''} // ✅ เพิ่มบรรทัดนี้
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
                        {/* [T-005-E2] Removed Delete Button for New Row as requested */}
                      </td>
                    </tr>
                  ))}

                  {/* ✅ Render Filtered Subtasks */}
                  {getFilteredAndSortedSubtasks().map((subtask, index) => {
                    const deadlineStatus = subtask.deadlineStatus || {
                      text: '-',
                      bgColor: '',
                      isOverdue: false
                    };

                    const isEditing = editingSubtaskId === subtask.id;
                    // ✅ Use taskId lookup
                    const task = subtask.taskId
                      ? tasks.find(t => t.id === subtask.taskId)
                      : tasks.find(t => t.taskName === subtask.taskName);

                    // ✅ ตรวจสอบว่าแถวนี้ถูกแก้ไขหรือไม่
                    const isEdited = !!editedSubtasks[subtask.id];

                    return (
                      <tr
                        key={`existing-${subtask.subTaskNumber}-${index}`}
                        className={`hover:bg-gray-50 ${deadlineStatus.bgColor} ${isEditing
                          ? 'bg-blue-100 border-l-4 border-blue-400'
                          : isEdited
                            ? 'bg-blue-50 border-l-4 border-blue-300'
                            : ''
                          }`}
                      >
                        {/* SUBTASK ID - ไม่แก้ไข */}
                        <td className="px-2 py-2 text-xs text-gray-900 whitespace-normal break-words">
                          {/* [T-028] Display subtask ID in uppercase */}
                          {subtask.subTaskNumber.toUpperCase()}
                          {isEdited && (
                            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              แก้ไขแล้ว
                            </span>
                          )}
                        </td>

                        {/* ACTIVITY - ล็อคด้วย UI */}
                        <td className="px-2 py-2 text-xs">
                          {isEditing ? (
                            <div className="flex items-center space-x-1 text-gray-500">
                              <svg
                                className="w-3 h-3 text-gray-400"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              <span className="text-gray-600" title="ไม่สามารถแก้ไข Activity ได้">
                                {task?.taskCategory || '-'}
                              </span>
                            </div>
                          ) : (
                            <span className={`truncate ${isEdited ? 'text-blue-700 font-medium' : 'text-gray-900'}`}>
                              {isEdited && editedSubtasks[subtask.id]?.activity
                                ? editedSubtasks[subtask.id].activity
                                : task?.taskCategory || '-'
                              }
                            </span>
                          )}
                        </td>

                        {/* RELATE DRAWING - ล็อคด้วย disabled */}
                        <td className="px-2 py-2 text-xs">
                          {isEditing ? (
                            <div className="flex items-center space-x-1 text-gray-500">
                              <svg
                                className="w-3 h-3 text-gray-400"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              <span className="text-gray-600" title="ไม่สามารถแก้ไข Relate Drawing ได้">
                                {editingData?.relateDrawingName || '-'}
                              </span>
                            </div>
                          ) : (
                            <span
                              className={`whitespace-normal break-words ${isEdited ? 'text-blue-700 font-medium' : 'text-gray-500'}`}
                              title={subtask.taskName}
                            >
                              {subtask.taskName}
                            </span>
                          )}
                        </td>

                        {/* RELATE WORK - ✅ ไม่ล็อค แต่ต้องการ activity */}
                        <td className="px-2 py-2 text-xs">
                          {isEditing ? (
                            <RelateWorkSelect
                              activityId={editingData?.activity || ''}
                              value={editingData?.relateWork || ''}
                              onChange={(value) => handleUpdateEditData('relateWork', value)}
                              disabled={false}  // ✅ ไม่ล็อค
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
                        <td className="px-2 py-2 text-xs">
                          {isEditing ? (
                            <AssigneeSelect
                              projectName={projects.find(p => p.id === selectedProject)?.name || ''} // ✅ เพิ่มบรรทัดนี้
                              value={editingData?.assignee || ''}
                              onChange={(value) => handleUpdateEditData('assignee', value)}
                            />
                          ) : (
                            <span className={`truncate ${isEdited ? 'text-blue-700 font-medium' : 'text-gray-500'}`}>
                              {subtask.subTaskAssignee}
                            </span>
                          )}
                        </td>

                        {/* ✅ DUE DATE (View Only) */}
                        <td className="px-2 py-2 text-xs text-gray-500">
                          {(() => {
                            const dateToShow = subtask.endDate || task?.dueDate;
                            if (!dateToShow) return '-';

                            // Convert Timestamp to Date
                            const dateObj = dateToShow instanceof Timestamp ? dateToShow.toDate() : new Date(dateToShow.seconds * 1000);

                            return dateObj.toLocaleDateString('th-TH', {
                              day: '2-digit',
                              month: 'short',
                              year: '2-digit'
                            });
                          })()}
                        </td>

                        {/* DEADLINE - ไม่แก้ไข */}
                        <td className="px-2 py-2 text-xs">
                          <span className={`font-medium ${deadlineStatus.isOverdue ? 'text-red-600' :
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
                          {(() => {
                            const latestFile = subtask.latestDailyReportFileURL
                              ? {
                                fileName: subtask.latestDailyReportFileName || 'Daily Report',
                                fileUrl: subtask.latestDailyReportFileURL,
                              }
                              : (subtask.subTaskFiles && subtask.subTaskFiles.length > 0
                                ? subtask.subTaskFiles[0]
                                : null);

                            if (latestFile && latestFile.fileUrl) {
                              return (
                                <button
                                  onClick={() => handleOpenFile(latestFile)}
                                  className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors border border-blue-200 flex items-center gap-1 mx-auto"
                                >
                                  📎
                                </button>
                              );
                            }

                            return <span className="text-gray-400 text-xs">-</span>;
                          })()}
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
                                  className={`p-1 transition-colors ${isEditDataValid()
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
            Submit
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

          {editingSubtaskId && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">ฟิลด์ที่แก้ไข</h3>
                {editChangedFields.length > 0 ? (
                  <ul className="space-y-1 text-sm text-gray-600">
                    {editChangedFields.map((change, idx) => (
                      <li key={idx}>
                        <span className="font-medium text-gray-700">{change.label}:</span>{' '}
                        <span className="text-gray-500 line-through mr-1">{change.before}</span>
                        <span className="text-blue-700">{change.after}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">ไม่มีการเปลี่ยนแปลงข้อมูล</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุการแก้ไข</label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="อธิบายเหตุผลหรือรายละเอียดการแก้ไข"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">แนบไฟล์อ้างอิง (ถ้ามี)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    onChange={(e) => handleEditAttachmentChange(e.target.files?.[0] || null)}
                    className="text-sm"
                  />
                  {editAttachment && (
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:text-red-800"
                      onClick={() => handleEditAttachmentChange(null)}
                    >
                      ลบไฟล์
                    </button>
                  )}
                </div>
                {editAttachment && (
                  <p className="text-xs text-gray-500 mt-1">{editAttachment.name}</p>
                )}
                {editAttachmentError && (
                  <p className="text-xs text-red-500 mt-1">{editAttachmentError}</p>
                )}
              </div>
            </div>
          )}
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
              disabled={isSaving || Boolean(editAttachmentError)}
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
