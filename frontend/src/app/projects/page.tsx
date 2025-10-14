"use client";

import React, { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import CreateProjectModal from "@/components/modals/CreateProjectModal";
import ProjectListModal from "@/components/modals/ProjectListModal";
import { createProject, updateProjectLeader } from "@/services/firebase";
import { fetchProjects, fetchRelateWorks, fetchTasks } from "@/services/firebase";
import { Project, Task } from "@/types/database";
import SaveConfirmationModal from "@/components/modals/SaveConfirmationModal";
import { updateTask, createTask } from "@/services/firebase";
import SuccessModal from "@/components/modals/SuccessModal";
import AddRevisionModal from "@/components/modals/AddRevisionModal";
import DeleteConfirmModal from "@/components/modals/DeleteConfirmModal";
import { deleteTask } from "@/services/firebase";
import ExportModal from "@/components/modals/ExportModal";
import { exportGanttChart } from "@/utils/exportGanttChart";
import ImportExcelModal from '@/components/modals/ImportExcelModal';
import ViewDeletedModal from '@/components/modals/ViewDeletedModal';

interface TaskRow {
  firestoreId?: string;
  id: string;
  relateDrawing: string;
  activity: string;
  startDate: string;
  dueDate: string;
  statusDwg: string;
  lastRev: string;
  docNo: string;
  link?: string;
  progress?: number;
  correct: boolean;
}

const initialRows: TaskRow[] = [
  {
    id: "",
    relateDrawing: "",
    activity: "",
    startDate: "",
    dueDate: "",
    statusDwg: "",
    lastRev: "",
    docNo: "",
    link: "",
    progress: 0,
    correct: false
  }
];

const formatDate = (timestamp: any): string => {
  if (!timestamp) return "";
  
  if (typeof timestamp === 'string' && (timestamp === '#N/A' || timestamp === 'N/A')) {
    return "";
  }
  
  try {
    if (timestamp instanceof Timestamp) {
      const date = timestamp.toDate();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    if (timestamp instanceof Date) {
      const year = timestamp.getFullYear();
      const month = String(timestamp.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    if (typeof timestamp === 'string') {
      const thaiMonthMap: { [key: string]: string } = {
        'ม.ค.': '01', 'ก.พ.': '02', 'มี.ค.': '03', 'เม.ย.': '04',
        'พ.ค.': '05', 'มิ.ย.': '06', 'ก.ค.': '07', 'ส.ค.': '08',
        'ก.ย.': '09', 'ต.ค.': '10', 'พ.ย.': '11', 'ธ.ค.': '12'
      };
      
      const parts = timestamp.split('/').map(part => part.trim());
      
      if (parts.length === 3) {
        const dayNum = parseInt(parts[0]);
        const monthThai = parts[1];
        const yearNum = parseInt(parts[2]);
        const month = thaiMonthMap[monthThai];
        
        if (month && !isNaN(dayNum) && !isNaN(yearNum)) {
          const day = String(dayNum).padStart(2, '0');
          return `${yearNum}-${month}-${day}`;
        }
      }
      
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    if (typeof timestamp === 'object' && timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return "";
  } catch (error) {
    console.error('Error formatting date:', error, timestamp);
    return "";
  }
};

const convertTaskToRow = (task: Task & { id: string }): TaskRow => {
  const taskData = task as any;
  
  return {
    firestoreId: task.id,
    id: taskData.taskNumber || task.id,
    relateDrawing: taskData.taskName || "",
    activity: taskData.taskCategory || "",
    startDate: formatDate(taskData.planStartDate),
    dueDate: formatDate(taskData.dueDate),
    statusDwg: taskData.currentStep || "",
    lastRev: taskData.rev || "00",
    docNo: taskData.documentNumber || "",
    link: taskData.link || "",
    progress: taskData.progress || 0,
    correct: false
  };
};

const generateTaskId = (
  projectAbbr: string,
  activityName: string,
  existingRows: TaskRow[],
  activities: any[],
  currentCounter: number
): string => {
  let activityOrder = "XXX";
  
  if (activityName && activityName !== "เลือก Activity") {
    const activityIndex = activities.findIndex(a => a.activityName === activityName);
    if (activityIndex >= 0) {
      activityOrder = String(activityIndex + 1).padStart(3, '0');
    }
  }
  
  const runningNo = String(currentCounter).padStart(3, '0');
  return `TTS-BIM-${projectAbbr}-${activityOrder}-${runningNo}`;
};

const translateStatus = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'PENDING_REVIEW': 'รอตรวจสอบ',
    'PENDING_CM_APPROVAL': 'ส่ง CM',
    'REVISION_REQUIRED': 'แก้ไข',
    'APPROVED': 'อนุมัติ',
    'APPROVED_WITH_COMMENTS': 'อนุมัติตามคอมเมนต์ (ไม่แก้ไข)',
    'APPROVED_REVISION_REQUIRED': 'อนุมัติตามคอมเมนต์ (ต้องแก้ไข)',
    'REJECTED': 'ไม่อนุมัติ'
  };
  
  return statusMap[status] || status;
};

const ProjectsPage = () => {
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [rows, setRows] = useState<TaskRow[]>(initialRows);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProjectListOpen, setIsProjectListOpen] = useState(false);
  const [touchedRows, setTouchedRows] = useState<Set<number>>(new Set());
  
  const [projects, setProjects] = useState<(Project & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [editingRows, setEditingRows] = useState<Set<number>>(new Set());
  const [editedRows, setEditedRows] = useState<Set<number>>(new Set());
  const [originalRows, setOriginalRows] = useState<Map<number, TaskRow>>(new Map());
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalData, setSaveModalData] = useState<{
    updated: Array<{ id: string; name: string; changes: string[] }>;
    created: Array<{ id: string; name: string; changes: string[] }>;
  }>({ updated: [], created: [] });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showAddRevModal, setShowAddRevModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ idx: number; row: TaskRow } | null>(null);
  const [allTasksCache, setAllTasksCache] = useState<(Task & { id: string })[]>([]);
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const [filterActivity, setFilterActivity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [highlightedRow, setHighlightedRow] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  
  const [pendingRevCount, setPendingRevCount] = useState(0);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setActivitiesLoading(true);
        const activitiesData = await fetchRelateWorks();
        setActivities(activitiesData);
      } catch (error) {
        console.error('Error loading activities:', error);
      } finally {
        setActivitiesLoading(false);
      }
    };
    loadActivities();
  }, []);

  useEffect(() => {
    const loadAllTasks = async () => {
      if (cacheLoaded || projects.length === 0) return;
      
      try {
        setTasksLoading(true);
        const allTasks = await fetchTasks();
        setAllTasksCache(allTasks);
        setCacheLoaded(true);
      } catch (error) {
        console.error('Error loading tasks:', error);
      } finally {
        setTasksLoading(false);
      }
    };
    
    loadAllTasks();
  }, [projects, cacheLoaded]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        const projectsData = await fetchProjects();
        setProjects(projectsData);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    if (!cacheLoaded || allTasksCache.length === 0) {
      return;
    }
    
    const filterTasks = () => {
      let tasksData = selectedProject === "all"
        ? allTasksCache
        : allTasksCache.filter(t => t.projectId === selectedProject);

      if (filterActivity) {
        tasksData = tasksData.filter(t => t.taskCategory === filterActivity);
      }

      if (filterStatus) {
        tasksData = tasksData.filter(t => t.currentStep === filterStatus);
      }

      if (tasksData.length > 0) {
        let taskRows = tasksData.map(convertTaskToRow);
        
        const currentProject = projects.find(p => 
          selectedProject === "all" ? false : p.id === selectedProject
        );
        
        if (currentProject && currentProject.abbr) {
          let counter = 1;
          taskRows = taskRows.map(row => {
            if (row.id) return row;
            const newId = generateTaskId(
              currentProject.abbr,
              row.activity,
              taskRows,
              activities,
              counter
            );
            counter++;
            return { ...row, id: newId };
          });
        }
        
        setRows([...taskRows, initialRows[0]]);
        setTouchedRows(new Set());
      } else {
        setRows(initialRows);
        setTouchedRows(new Set());
      }
    };
    
    filterTasks();
  }, [selectedProject, allTasksCache, cacheLoaded, projects, activities, filterActivity, filterStatus]);

  useEffect(() => {
    if (!cacheLoaded || allTasksCache.length === 0) {
      return;
    }

    let tasksToCheck = allTasksCache;
    
    if (selectedProject !== "all") {
      tasksToCheck = allTasksCache.filter(t => t.projectId === selectedProject);
    }

    const needsRevision = tasksToCheck.filter(t => {
      if (t.currentStep !== 'APPROVED_REVISION_REQUIRED' && t.currentStep !== 'REJECTED') {
        return false;
      }
      
      const baseName = t.taskName.replace(/\s+REV\.\d+$/i, '');
      const currentRev = parseInt(t.rev || '0');
      const nextRev = String(currentRev + 1).padStart(2, '0');
      const nextRevName = `${baseName} REV.${nextRev}`;
      
      const hasNextRev = tasksToCheck.some(task => 
        task.taskName === nextRevName || 
        task.taskName.replace(/\s+REV\.\d+$/i, '') === baseName && 
        parseInt(task.rev || '0') > currentRev
      );
      
      return !hasNextRev;
    });

    setPendingRevCount(needsRevision.length);
  }, [allTasksCache, cacheLoaded, selectedProject]);

  const handleCreateProject = async (projectData: { name: string; code: string; leader: string }) => {
    try {
      await createProject(projectData);
      setIsCreateModalOpen(false);
      
      const projectsData = await fetchProjects();
      setProjects(projectsData);
      
      alert('สร้างโปรเจกต์สำเร็จ');
    } catch (error) {
      console.error('Error creating project:', error);
      alert('เกิดข้อผิดพลาดในการสร้างโปรเจกต์');
    }
  };

  const handleUpdateLeader = async (projectId: string, newLeader: string) => {
    try {
      await updateProjectLeader(projectId, newLeader);
      
      const projectsData = await fetchProjects();
      setProjects(projectsData);
      
      alert('อัพเดท Leader สำเร็จ');
    } catch (error) {
      console.error('Error updating leader:', error);
      alert('เกิดข้อผิดพลาดในการอัพเดท');
    }
  };

  const handleRowChange = (idx: number, field: keyof TaskRow, value: string | boolean) => {
    setRows(rows => rows.map((row, i) => i === idx ? { ...row, [field]: value } : row));
    if (rows[idx]?.firestoreId) {
      setEditedRows(prev => new Set(prev).add(idx));
    }
  };

  const handleRowFocus = (idx: number) => {
    console.log('🔍 handleRowFocus called:', { idx, touched: touchedRows.has(idx), rowsLength: rows.length });
    
    if (!touchedRows.has(idx)) {
      console.log('✅ Adding new row');
      setTouchedRows(prev => new Set(prev).add(idx));
      setRows(rows => {
        if (!rows[idx + 1]) {
          console.log('🆕 Creating new empty row');
          return [...rows, {
            id: "",
            relateDrawing: "",
            activity: "",
            startDate: "",
            dueDate: "",
            statusDwg: "",
            lastRev: "",
            docNo: "",
            link: "",
            progress: 0,
            correct: false
          }];
        }
        console.log('⏭️ Next row already exists');
        return rows;
      });
    } else {
      console.log('⛔ Row already touched');
    }
  };

  const handleDelete = (idx: number) => {
    const rowToDelete = rows[idx];
    
    const isEmptyRow = !rowToDelete.id && !rowToDelete.relateDrawing && !rowToDelete.activity && !rowToDelete.startDate && !rowToDelete.dueDate;
    
    if (isEmptyRow && idx === rows.length - 1) {
      alert('ไม่สามารถลบแถวว่างแถวสุดท้ายได้');
      return;
    }
    
    if (rowToDelete.statusDwg) {
      alert('ไม่สามารถลบแถวที่มีสถานะเอกสารได้');
      return;
    }
    
    if (rowToDelete.progress && rowToDelete.progress > 0) {
      alert('ไม่สามารถลบงานที่มีความคืบหน้าแล้ว');
      return;
    }
    
    setDeleteTarget({ idx, row: rowToDelete });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      const { idx, row } = deleteTarget;
      
      if (row.firestoreId) {
        await deleteTask(row.firestoreId);
        console.log('✅ ลบจาก Firestore:', row.firestoreId);
      }
      
      setRows(prevRows => prevRows.filter((_, i) => i !== idx));
      
      setTouchedRows(prev => {
        const newTouched = new Set<number>();
        prev.forEach(touchedIdx => {
          if (touchedIdx < idx) newTouched.add(touchedIdx);
          else if (touchedIdx > idx) newTouched.add(touchedIdx - 1);
        });
        return newTouched;
      });
      
      setEditingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(idx);
        return newSet;
      });
      
      setEditedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(idx);
        return newSet;
      });
      
      setOriginalRows(prev => {
        const newMap = new Map(prev);
        newMap.delete(idx);
        return newMap;
      });
      
      console.log('✅ ลบแถวสำเร็จ:', row.relateDrawing);
      
    } catch (error) {
      console.error('❌ Error deleting:', error);
      alert('เกิดข้อผิดพลาดในการลบ');
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const handleSave = async () => {
    if (!selectedProject) {
      alert('กรุณาเลือกโครงการก่อน');
      return;
    }

    const currentProject = projects.find(p => p.id === selectedProject);
    if (!currentProject || !currentProject.abbr) {
      alert('ไม่พบข้อมูลโครงการ');
      return;
    }

    const rowsToUpdate: TaskRow[] = [];
    const rowsToCreate: TaskRow[] = [];

    rows.forEach((row, idx) => {
      if (!row.relateDrawing || !row.activity || !row.startDate || !row.dueDate) {
        return;
      }

      if (row.firestoreId && editedRows.has(idx)) {
        rowsToUpdate.push(row);
      } else if (!row.firestoreId) {
        rowsToCreate.push(row);
      }
    });

    console.log('🔍 Save analysis:', {
      totalRows: rows.length,
      toUpdate: rowsToUpdate.length,
      toCreate: rowsToCreate.length,
      createRows: rowsToCreate.map(r => ({
        name: r.relateDrawing,
        rev: r.lastRev,
        hasId: !!r.id
      }))
    });

    if (rowsToUpdate.length === 0 && rowsToCreate.length === 0) {
      alert('ไม่มีข้อมูลที่ต้องบันทึก');
      return;
    }

    const modalData = {
      updated: rowsToUpdate.map((r, index) => {
        const rowIdx = rows.findIndex(row => row.firestoreId === r.firestoreId);
        const original = originalRows.get(rowIdx);
        
        const changes: string[] = [];
        if (original) {
          if (original.relateDrawing !== r.relateDrawing) {
            changes.push(`ชื่อเอกสาร: "${original.relateDrawing}" → "${r.relateDrawing}"`);
          }
          if (original.activity !== r.activity) {
            changes.push(`Activity: "${original.activity}" → "${r.activity}"`);
          }
          if (original.startDate !== r.startDate) {
            changes.push(`วันเริ่มตามแผน: ${original.startDate || '-'} → ${r.startDate}`);
          }
          if (original.dueDate !== r.dueDate) {
            changes.push(`วันครบกำหนด: ${original.dueDate || '-'} → ${r.dueDate}`);
          }
        }
        
        return {
          id: r.id,
          name: r.relateDrawing,
          changes: changes.length > 0 ? changes : ['ไม่มีการเปลี่ยนแปลง']
        };
      }),
      created: rowsToCreate.map(r => ({
        id: '(จะสร้างใหม่)',
        name: r.relateDrawing,
        changes: [
          `Activity: ${r.activity}`,
          `วันเริ่มตามแผน: ${r.startDate}`,
          `วันครบกำหนด: ${r.dueDate}`
        ]
      }))
    };

    setSaveModalData(modalData);
    setShowSaveModal(true);
  };

  const confirmSave = async () => {
    setShowSaveModal(false);

    try {
      const currentProject = projects.find(p => p.id === selectedProject);
      if (!currentProject) return;

      const updatePromises = saveModalData.updated.map(async (updatedItem) => {
        const row = rows.find(r => r.id === updatedItem.id);
        if (!row || !row.firestoreId) return;

        await updateTask(row.firestoreId, {
          taskName: row.relateDrawing,
          taskCategory: row.activity,
          planStartDate: row.startDate ? Timestamp.fromDate(new Date(row.startDate)) : null,
          dueDate: row.dueDate ? Timestamp.fromDate(new Date(row.dueDate)) : null
        } as any);
      });

      await Promise.all(updatePromises);

      let finalRows = [...rows];
      const rowsToCreate = rows.filter(r => !r.firestoreId && !r.id && r.relateDrawing && r.activity);

      if (rowsToCreate.length > 0) {
        const maxRunning = rows.reduce((max, row) => {
          if (!row.id || !row.id.startsWith('TTS-BIM-')) return max;
          const parts = row.id.split('-');
          if (parts.length >= 5) {
            return Math.max(max, parseInt(parts[4]) || 0);
          }
          return max;
        }, 0);

        let counter = maxRunning + 1;

        const createPromises = rowsToCreate.map(async (row) => {
          const taskId = row.id || generateTaskId(
            currentProject.abbr,
            row.activity,
            rows,
            activities,
            counter++
          );

          const newFirestoreId = await createTask(selectedProject, {
            ...row,
            id: taskId,
            rev: row.lastRev || '00'
          });

          return { ...row, id: taskId, firestoreId: newFirestoreId };
        });

        const createdRows = await Promise.all(createPromises);

        finalRows = rows.map(row => {
          const created = createdRows.find(cr => 
            cr.relateDrawing === row.relateDrawing && !row.firestoreId
          );
          return created || row;
        });

        setRows(finalRows);
      }

      console.log('✅ บันทึกสำเร็จ');
      console.log('📝 อัพเดท:', saveModalData.updated.length, 'รายการ');
      console.log('🆕 สร้างใหม่:', rowsToCreate.length, 'รายการ');

      setSuccessMessage(`บันทึกสำเร็จ ${saveModalData.updated.length} รายการแก้ไข และ ${rowsToCreate.length} รายการใหม่`);
      setShowSuccessModal(true);
      setEditingRows(new Set());
      setEditedRows(new Set());
      setOriginalRows(new Map());

    } catch (error) {
      console.error('❌ Error saving:', error);
      alert('❌ เกิดข้อผิดพลาดในการบันทึก: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleEdit = (idx: number) => {
    setOriginalRows(prev => {
      const newMap = new Map(prev);
      if (!prev.has(idx)) {
        newMap.set(idx, { ...rows[idx] });
      }
      return newMap;
    });
    setEditingRows(prev => new Set(prev).add(idx));
  };

  const handleCancelEdit = (idx: number) => {
    const original = originalRows.get(idx);
    if (original) {
      setRows(rows => rows.map((row, i) => i === idx ? original : row));
    }
    setEditingRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(idx);
      return newSet;
    });
    setEditedRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(idx);
      return newSet;
    });
  };

  const handleExport = async (options: any) => {
    try {
      if (options.exportType === 'gantt') {
        const project = projects.find(p => p.id === (options.projectId === 'all' ? selectedProject : options.projectId));
        const projectName = project?.name || 'All Projects';
        const projectLead = project?.projectAssignee || 'N/A';
        
        let filteredRows = rows.filter(r => 
          r.relateDrawing && 
          r.relateDrawing.trim() !== '' && 
          r.startDate && 
          r.dueDate
        );

        console.log('🔍 Debug Export:', {
          totalRows: rows.length,
          filteredRows: filteredRows.length,
          sampleRow: filteredRows[0]
        });

        if (filteredRows.length === 0) {
          alert('❌ ไม่มีข้อมูลที่จะ Export\n\nกรุณาตรวจสอบว่ามีงานที่มีวันเริ่มและวันสิ้นสุดครบถ้วน');
          return;
        }

        let start: Date, end: Date;
        
        if (options.startDate && options.endDate) {
          start = new Date(options.startDate);
          end = new Date(options.endDate);
          
          const beforeFilter = filteredRows.length;
          filteredRows = filteredRows.filter(r => {
            const taskStart = new Date(r.startDate);
            const taskEnd = new Date(r.dueDate);
            return taskStart <= end && taskEnd >= start;
          });
          
          console.log(`📅 Date filter: ${beforeFilter} → ${filteredRows.length} tasks`);
          
          if (filteredRows.length === 0) {
            alert(`❌ ไม่มีงานในช่วง ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`);
            return;
          }
        } else {
          const dates = filteredRows.flatMap(r => [
            new Date(r.startDate).getTime(),
            new Date(r.dueDate).getTime()
          ]);
          start = new Date(Math.min(...dates));
          end = new Date(Math.max(...dates));
        }

        console.log('✅ Exporting:', {
          tasks: filteredRows.length,
          dateRange: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
        });

        await exportGanttChart(
          filteredRows.map(r => ({
            id: r.id,
            relateDrawing: r.relateDrawing,
            activity: r.activity,
            startDate: r.startDate,
            dueDate: r.dueDate,
            progress: r.progress || 0,
            statusDwg: r.statusDwg || ''
          })),
          projectName,
          projectLead,
          start,
          end
        );
        
        alert(`✅ Export สำเร็จ! (${filteredRows.length} tasks)`);
        
      } else {
        alert('Simple export coming soon!');
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      alert('เกิดข้อผิดพลาดในการ Export:\n' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleSelectTaskForRevision = (task: any) => {
    const relatedTasks = rows.filter(r => 
      r.relateDrawing.startsWith(task.taskName.replace(/\sREV\.\d+$/, ''))
    );
    
    const maxRev = relatedTasks.reduce((max, r) => {
      const revMatch = r.lastRev?.match(/\d+/);
      return revMatch ? Math.max(max, parseInt(revMatch[0])) : max;
    }, 0);
    
    const nextRev = String(maxRev + 1).padStart(2, '0');
    
    const originalRow = rows.find(r => r.id === task.id);
    const docNo = originalRow?.docNo || "";
    
    const newRow = {
      id: "",
      relateDrawing: `${task.taskName} REV.${nextRev}`,
      activity: task.taskCategory,
      startDate: "",
      dueDate: "",
      statusDwg: "",
      lastRev: nextRev,
      docNo: docNo,
      link: "",
      progress: 0,
      correct: false
    };
    
    const nonEmptyRows = rows.filter(r => r.relateDrawing || r.activity);
    setRows([...nonEmptyRows, newRow, initialRows[0]]);
    
    setHighlightedRow(nonEmptyRows.length);
    setTimeout(() => setHighlightedRow(null), 2000);
  };

  const handleRestoreComplete = async () => {
    try {
      const allTasks = await fetchTasks();
      setAllTasksCache(allTasks);
      alert('✅ รีโหลดข้อมูลสำเร็จ');
    } catch (error) {
      console.error('Error reloading tasks:', error);
    }
  };

  const statuses = ["กำลังดำเนินการ", "เสร็จสิ้น", "รอดำเนินการ"];

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      {/* ลบส่วน Navbar ออก เพราะ PageLayout render ให้แล้ว */}
      
      {/* ลบ padding: "40px 40px" ออก ให้ PageLayout จัดการ margin-top แทน */}
      <div style={{ maxWidth: "100%", margin: "35px auto 0 auto" }}>
        <div style={{ marginBottom: "24px", display: "flex", gap: "16px", alignItems: "center" }}>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              padding: "8px 16px",
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              color: "#374151",
              fontWeight: 500
            }}
          >
            <span style={{ color: "#6366f1", fontWeight: "bold" }}>+</span> สร้างโครงการใหม่
          </button>
          
          <CreateProjectModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreateProject}
            onViewProjects={() => {
              setIsCreateModalOpen(false);
              setIsProjectListOpen(true);
            }}
          />

          <ProjectListModal
            isOpen={isProjectListOpen}
            onClose={() => setIsProjectListOpen(false)}
            projects={projects}
            onUpdateLeader={handleUpdateLeader}
          />
          
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            disabled={loading}
            style={{ 
              padding: "8px 12px",
              width: "200px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "14px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              backgroundColor: loading ? "#f3f4f6" : "#fff",
              color: "#374151",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            <option value="all">ทุกโครงการ</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            style={{ 
              padding: "8px 12px",
              width: "150px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
            }}
          >
            <option value="">สถานะ</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div style={{ 
          background: "#fff", 
          padding: "24px", 
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ marginBottom: "16px", borderBottom: "1px solid #e5e7eb", paddingBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "14px" }}>Project Name</div>
                <div style={{ color: "#666", fontSize: "14px" }}>
                  {selectedProject === "all"
                    ? "ทุกโครงการ"
                    : selectedProject 
                    ? projects.find(p => p.id === selectedProject)?.name || "ไม่พบโครงการ"
                    : "แสดง ชื่อโครงการ"
                  }
                </div>
            </div>
          </div>

          {tasksLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>กำลังโหลดข้อมูล...</div>
          ) : (
            <div style={{ 
              overflowX: "auto", 
              overflowY: "auto", 
              maxHeight: "calc(100vh - 300px)",
              position: "relative",
              border: "1px solid #e5e7eb"
            }}>
              <table style={{ 
                width: "100%", 
                borderCollapse: "collapse"
              }}>
                <thead style={{ 
                  position: "sticky", 
                  top: 0, 
                  zIndex: 10,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}>
                  <tr style={{ background: "#ff4d00" }}>
                    <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "140px" }}>TASK ID</th>
                    <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "180px" }}>RELATE DRAWING</th>
                    <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "140px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span>ACTIVITY</span>
                        <select
                          value={filterActivity}
                          onChange={e => setFilterActivity(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          style={{
                            width: "20px",
                            padding: "0",
                            fontSize: "10px",
                            border: "1px solid #fff",
                            borderRadius: "3px",
                            background: "#fff",
                            color: "#000",
                            cursor: "pointer"
                          }}
                        >
                          <option value="">ทั้งหมด</option>
                          {[...new Set(allTasksCache.map(t => t.taskCategory))].filter(Boolean).map(act => (
                            <option key={act} value={act}>{act}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "120px" }}>PLAN START DATE</th>
                    <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "110px" }}>DUE DATE</th>
                    <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "180px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span>STATUS DWG.</span>
                        <select
                          value={filterStatus}
                          onChange={e => setFilterStatus(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          style={{
                            width: "20px",
                            padding: "0",
                            fontSize: "10px",
                            border: "1px solid #fff",
                            borderRadius: "3px",
                            background: "#fff",
                            color: "#000",
                            cursor: "pointer"
                          }}
                        >
                          <option value="">ทั้งหมด</option>
                          <option value="PENDING_REVIEW">รอตรวจสอบ</option>
                          <option value="PENDING_CM_APPROVAL">ส่ง CM</option>
                          <option value="REVISION_REQUIRED">แก้ไข</option>
                          <option value="APPROVED">อนุมัติ</option>
                          <option value="APPROVED_WITH_COMMENTS">อนุมัติตามคอมเมนต์ (ไม่แก้ไข)</option>
                          <option value="APPROVED_REVISION_REQUIRED">อนุมัติตามคอมเมนต์ (ต้องแก้ไข)</option>
                          <option value="REJECTED">ไม่อนุมัติ</option>
                        </select>
                      </div>
                    </th>
                    <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "center", color: "white", whiteSpace: "nowrap", minWidth: "70px" }}>LINK FILE</th>
                    <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "120px" }}>DOC. NO.</th>
                    <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "80px" }}>LAST REV.</th>
                    <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "center", color: "white", whiteSpace: "nowrap", minWidth: "90px" }}>CORRECT</th>
                    <th style={{ padding: "8px 12px", width: 40, color: "white" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isNewRow = !row.id;
                    const isEditing = editingRows.has(idx);
                    const isEditable = isNewRow || isEditing;
                    
                    return (
                      <tr 
                        key={row.firestoreId || `row-${idx}`} 
                        style={{ 
                          borderBottom: "1px solid #e5e7eb", 
                          background: highlightedRow === idx 
                            ? "#fef08a" 
                            : isEditing 
                            ? "#fff7ed" 
                            : idx % 2 === 0 
                            ? "#f9fafb" 
                            : "#fff",
                          transition: "background-color 0.15s ease-out",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => {
                          if (highlightedRow !== idx && !isEditing) {
                            e.currentTarget.style.backgroundColor = "#e0f2fe";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (highlightedRow !== idx && !isEditing) {
                            e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "#f9fafb" : "#fff";
                          }
                        }}
                      >
                        <td style={{ padding: "4px 6px", fontSize: 10, color: "#2563eb", minWidth: "150px" }}>{row.id}</td>
                        <td style={{ padding: "4px 6px", fontSize: 10, minWidth: "250px" }}>
                          <input
                            type="text"
                            value={row.relateDrawing}
                            onClick={() => handleRowFocus(idx)}
                            onChange={e => handleRowChange(idx, "relateDrawing", e.target.value)}
                            disabled={!isEditable}
                            style={{ 
                              width: "100%", 
                              padding: "4px 6px", 
                              border: "1px solid #e5e7eb",
                              borderRadius: "4px",
                              fontSize: 10,
                              color: "#374151",
                              backgroundColor: !isEditable ? (idx % 2 === 0 ? "#f9fafb" : "#fff") : "#fff",
                              cursor: !isEditable ? "not-allowed" : "text"
                            }}
                          />
                        </td>
                        <td style={{ padding: "6px 10px", fontSize: 10 }}>
                          <select 
                            value={row.activity}
                            onClick={() => handleRowFocus(idx)}
                            onChange={e => handleRowChange(idx, "activity", e.target.value)}
                            disabled={activitiesLoading || !isEditable}
                            style={{ 
                              width: "100%", 
                              padding: "4px 6px", 
                              border: "1px solid #e5e7eb",
                              borderRadius: "4px",
                              fontSize: 10,
                              color: "#374151",
                              backgroundColor: !isEditable ? (idx % 2 === 0 ? "#f9fafb" : "#fff") : activitiesLoading ? "#f3f4f6" : "#fff",
                              cursor: !isEditable ? "not-allowed" : activitiesLoading ? "not-allowed" : "pointer"
                            }}
                          >
                            <option value="">{activitiesLoading ? "กำลังโหลด..." : "เลือก Activity"}</option>
                            {activities.map(act => (
                              <option key={act.id} value={act.activityName}>{act.activityName}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: "6px 10px", fontSize: 10 }}>
                          <input
                            type="date"
                            value={row.startDate}
                            onClick={() => handleRowFocus(idx)}
                            onChange={e => handleRowChange(idx, "startDate", e.target.value)}
                            disabled={!isEditable}
                            style={{ 
                              width: "100%", 
                              padding: "4px 6px", 
                              border: "1px solid #e5e7eb",
                              borderRadius: "4px",
                              fontSize: 10,
                              backgroundColor: !isEditable ? (idx % 2 === 0 ? "#f9fafb" : "#fff") : "#fff",
                              cursor: !isEditable ? "not-allowed" : "text"
                            }}
                          />
                        </td>
                        <td style={{ padding: "6px 10px", fontSize: 10 }}>
                          <input
                            type="date"
                            value={row.dueDate}
                            onClick={() => handleRowFocus(idx)}
                            onChange={e => handleRowChange(idx, "dueDate", e.target.value)}
                            disabled={!isEditable}
                            style={{ 
                              width: "100%", 
                              padding: "4px 6px", 
                              border: "1px solid #e5e7eb",
                              borderRadius: "4px",
                              fontSize: 10,
                              backgroundColor: !isEditable ? (idx % 2 === 0 ? "#f9fafb" : "#fff") : "#fff",
                              cursor: !isEditable ? "not-allowed" : "text"
                            }}
                          />
                        </td>
                        <td style={{ padding: "4px 6px", fontSize: 10, color: "#2563eb" }}>
                          {row.statusDwg ? translateStatus(row.statusDwg) : ""}
                        </td>
                        <td style={{ padding: "4px 6px", fontSize: 10, textAlign: "center" }}>
                          {row.link ? (
                            <a 
                              href={row.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#3b82f6", textDecoration: "none", fontSize: "16px" }}
                              title="คลิกเพื่อดูไฟล์"
                            >
                              📎
                            </a>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: "4px 6px", fontSize: 10 }}>{row.docNo}</td>
                        <td style={{ padding: "4px 6px", fontSize: 10, color: "#2563eb", fontWeight: 500 }}>
                          {row.lastRev || "00"}
                        </td>
                        <td style={{ padding: "2px 3px", fontSize: 10, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {row.statusDwg ? (
                            <span style={{ fontSize: 10, color: "#9ca3af" }}>-</span>
                          ) : isNewRow ? (
                            <span style={{ fontSize: 10, color: "#9ca3af" }}>ใหม่</span>
                          ) : isEditing ? (
                            <button 
                              onClick={() => handleCancelEdit(idx)}
                              style={{
                                padding: "3px 10px",
                                background: "#10b981",
                                border: "none",
                                borderRadius: "3px",
                                fontSize: 10,
                                cursor: "pointer",
                                color: "white",
                                boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)"
                              }}
                            >
                              บันทึก
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleEdit(idx)}
                              style={{
                                padding: "4px",
                                background: "none",
                                border: "none",
                                borderRadius: "3px",
                                cursor: "pointer",
                                color: "#3b82f6",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                              title="แก้ไข"
                            >
                              <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                          )}
                        </td>
                        <td style={{ padding: "2px 4px", fontSize: 10, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {(() => {
                            const isEmptyRow = !row.id && !row.relateDrawing && !row.activity && !row.startDate && !row.dueDate;
                            const isLastEmptyRow = isEmptyRow && idx === rows.length - 1;
                            const hasStatus = !!row.statusDwg;
                            const hasProgress = row.progress && row.progress > 0;
                            
                            if (isLastEmptyRow || hasStatus || hasProgress) {
                              return <span style={{ color: "#9ca3af" }}>-</span>;
                            }
                            
                            return (
                              <button
                                onClick={() => handleDelete(idx)}
                                style={{ 
                                  background: "none", 
                                  border: "none", 
                                  cursor: "pointer", 
                                  padding: "4px",
                                  color: "#ef4444",
                                  borderRadius: "3px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                                title="ลบ"
                              >
                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                </svg>
                              </button>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 24, textAlign: "right", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button
              onClick={handleSave}
              style={{
                padding: "8px 24px",
                background: "#f97316",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                cursor: "pointer",
                color: "white",
                fontWeight: 500,
                boxShadow: "0 1px 2px rgba(249, 115, 22, 0.1)"
              }}
            >
              SAVE
            </button>

            <button
              onClick={() => setShowAddRevModal(true)}
              style={{
                padding: "8px 16px",
                background: "#4f46e5",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                cursor: "pointer",
                color: "white",
                fontWeight: 500,
                boxShadow: "0 1px 2px rgba(79, 70, 229, 0.1)",
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              Add new Rev.
              {pendingRevCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-8px",
                    right: "-8px",
                    background: "#ef4444",
                    color: "white",
                    borderRadius: "50%",
                    width: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "bold",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                  }}
                >
                  {pendingRevCount}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setShowImportModal(true)}
              style={{
                padding: "8px 16px",
                background: "#059669",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                cursor: "pointer",
                color: "white",
                fontWeight: 500,
                boxShadow: "0 1px 2px rgba(5, 150, 105, 0.1)"
              }}
            >
              📥 Import Excel
            </button>          

            <button
              onClick={() => setShowExportModal(true)}
              style={{
                padding: "8px 16px",
                background: "#10b981",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                cursor: "pointer",
                color: "white",
                fontWeight: 500,
                boxShadow: "0 1px 2px rgba(16, 185, 129, 0.1)"
              }}
            >
              📊 Export
            </button>

            <button
              onClick={() => setShowDeletedModal(true)}
              style={{
                padding: "8px 16px",
                background: "#6b7280",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                cursor: "pointer",
                color: "white",
                fontWeight: 500,
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)"
              }}
            >
              🗑️ View Deleted
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }
      `}</style>

      <SaveConfirmationModal
        isOpen={showSaveModal}
        data={saveModalData}
        onConfirm={confirmSave}
        onCancel={() => setShowSaveModal(false)}
      />
      <SuccessModal
        isOpen={showSuccessModal}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
      <AddRevisionModal
        isOpen={showAddRevModal}
        tasks={rows.filter(r => r.firestoreId).map(r => ({
          id: r.id,
          taskName: r.relateDrawing,
          taskCategory: r.activity,
          currentStep: r.statusDwg,
          rev: r.lastRev
        }))}
        onSelect={handleSelectTaskForRevision}
        onClose={() => setShowAddRevModal(false)}
      />
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        taskName={deleteTarget?.row.relateDrawing || ''}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
      />
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        projects={projects}
        currentProjectId={selectedProject}
      />
      <ImportExcelModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        projectName={projects.find(p => p.id === selectedProject)?.name || 'Project'}
        activities={activities.map(a => a.activityName)}
        onImport={(tasks) => {
          console.log('Imported tasks:', tasks);
          setShowImportModal(false);
        }}
      />

      <ViewDeletedModal
        isOpen={showDeletedModal}
        onClose={() => setShowDeletedModal(false)}
        onRestore={handleRestoreComplete}
        currentProjectId={selectedProject}
      />
    </div>
  );
};

export default ProjectsPage;