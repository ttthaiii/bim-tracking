"use client";

export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import CreateProjectModal from "@/components/modals/CreateProjectModal";
import ProjectListModal from "@/components/modals/ProjectListModal";
import ManageUsersModal from "@/components/modals/ManageUsersModal";
import {
  createProject,
  updateProjectLeader,
  getProjectDetails,
  fetchRelateWorks,
  getTasksForProject,
  updateTask,
  createTask,
  deleteTask,
  getTaskEditHistory,
  getNextTaskCounter,
} from "@/services/firebase";
import { Project, Task } from "@/types/database";
import SaveConfirmationModal from "@/components/modals/SaveConfirmationModal";
import SuccessModal from "@/components/modals/SuccessModal";
import ErrorModal from '@/components/modals/ErrorModal';
import AddRevisionModal from "@/components/modals/AddRevisionModal";
import DeleteConfirmModal from "@/components/modals/DeleteConfirmModal";
import ExportModal from "@/components/modals/ExportModal";
import { exportGanttChart } from "@/utils/exportGanttChart";
import ImportExcelModal from '@/components/modals/ImportExcelModal';
import ViewDeletedModal from '@/components/modals/ViewDeletedModal';
import { uploadTaskEditAttachment } from "@/services/uploadService";
import FilePreviewModal from "@/components/modals/FilePreviewModal";
import { useAuth } from "@/context/AuthContext";
import { useCache } from "@/context/CacheContext";
import { getTaskStatusCategory, TaskStatusCategory, STATUS_CATEGORIES } from "@/services/dashboardService";

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
  subtaskCount?: number; // [T-004-E2]
  correct: boolean;
}

type EditChange = {
  field: string;
  label: string;
  before: string;
  after: string;
};

interface TaskEditHistoryEntry {
  timestamp?: Timestamp | Date | { seconds: number; nanoseconds?: number };
  fields?: EditChange[] | Array<{ field?: string; label?: string; before?: string; after?: string }>;
  note?: string;
  fileURL?: string;
  fileName?: string;
  storagePath?: string;
  fileUploadedAt?: Timestamp | Date | { seconds: number; nanoseconds?: number };
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
    subtaskCount: 0,
    correct: false,
  },
];

const formatDate = (timestamp: any): string => {
  if (!timestamp) return "";
  if (typeof timestamp === 'string' && (timestamp === '#N/A' || timestamp === 'N/A')) {
    return "";
  }
  try {
    let date: Date;
    if (timestamp instanceof Timestamp) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      const thaiMonthMap: { [key: string]: string } = { 'ม.ค.': '01', 'ก.พ.': '02', 'มี.ค.': '03', 'เม.ย.': '04', 'พ.ค.': '05', 'มิ.ย.': '06', 'ก.ค.': '07', 'ส.ค.': '08', 'ก.ย.': '09', 'ต.ค.': '10', 'พ.ย.': '11', 'ธ.ค.': '12' };
      const parts = timestamp.split('/').map(part => part.trim());
      if (parts.length === 3) {
        const dayNum = parseInt(parts[0]);
        const monthThai = parts[1];
        const yearNum = parseInt(parts[2]);
        const month = thaiMonthMap[monthThai];
        if (month && !isNaN(dayNum) && !isNaN(yearNum)) {
          return `${yearNum}-${month}-${String(dayNum).padStart(2, '0')}`;
        }
      }
      date = new Date(timestamp);
    } else if (typeof timestamp === 'object' && timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      return "";
    }
    if (!isNaN(date.getTime())) {
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
    subtaskCount: taskData.subtaskCount || 0, // [T-004-E2]
    correct: false,
  };
};

const generateTaskId = (projectAbbr: string, activityName: string, existingRows: TaskRow[], activities: any[], currentCounter: number): string => {
  let activityOrder = "XXX";
  if (activityName && activityName !== "เลือก Activity") {
    const activityIndex = activities.findIndex(a => a.activityName === activityName);
    if (activityIndex >= 0) {
      activityOrder = String(activityIndex + 1).padStart(3, '0');
    }
  }
  const runningNo = String(currentCounter).padStart(3, '0');
  return `TTS-BIM-${projectAbbr.toUpperCase()}-${activityOrder}-${runningNo}`;
};

const translateStatus = (status: string, isWorkRequest: boolean = false): string => {
  if (isWorkRequest) {
    // สถานะสำหรับ Work Request
    const workRequestStatusMap: { [key: string]: string } = {
      'PENDING_BIM': 'รอ BIM รับงาน',
      'IN_PROGRESS': 'กำลังดำเนินการ',
      'PENDING_ACCEPTANCE': 'รอตรวจรับ',
      'REVISION_REQUESTED': '⚠️ ขอแก้ไข (ต้องสร้าง Rev.)',
      'COMPLETED': 'เสร็จสิ้น'
    };
    return workRequestStatusMap[status] || status;
  } else {
    // สถานะสำหรับเอกสาร RFA
    const rfaStatusMap: { [key: string]: string } = {
      'PENDING_REVIEW': 'รอตรวจสอบ',
      'PENDING_CM_APPROVAL': 'ส่ง CM',
      'REVISION_REQUIRED': 'แก้ไข',
      'APPROVED': 'อนุมัติ',
      'APPROVED_WITH_COMMENTS': 'อนุมัติตามคอมเมนต์ (ไม่แก้ไข)',
      'APPROVED_REVISION_REQUIRED': 'อนุมัติตามคอมเมนต์ (ต้องแก้ไข)',
      'REJECTED': 'ไม่อนุมัติ'
    };
    return rfaStatusMap[status] || status;
  }
};

const ProjectsPage = () => {
  const { appUser } = useAuth();
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]); // [T-035] Multi-Select
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false); // [T-035] Dropdown State 
  const [searchTerm, setSearchTerm] = useState(""); // [T-034] Search Term
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null); // [T-037] Sorting
  const [rows, setRows] = useState<TaskRow[]>(initialRows);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProjectListOpen, setIsProjectListOpen] = useState(false);
  const [touchedRows, setTouchedRows] = useState<Set<number>>(new Set());
  // ✅ Use Cache Context
  const {
    projects,
    fetchProjects,
    // [T-053] Use Cache Context for immediate updates
    tasks: tasksCache, // FIX: Destructure as tasksCache to match existing logic
    fetchTasksForProject: refreshTasks
  } = useCache();

  // Local state for UI
  const [loading, setLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false); // Add tasks loading state
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [activities, setActivities] = useState<any[]>([]); // Restored missing state
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [editingRows, setEditingRows] = useState<Set<number>>(new Set());
  const [editedRows, setEditedRows] = useState<Set<number>>(new Set());
  const [originalRows, setOriginalRows] = useState<Map<number, TaskRow>>(new Map());
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalData, setSaveModalData] = useState<{ updated: Array<{ id: string; name: string; changes: string[]; rowIdx: number }>; created: Array<{ id: string; name: string; changes: string[] }>; }>({ updated: [], created: [] });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showAddRevModal, setShowAddRevModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isProjectLocked = !selectedProject || selectedProject === "all";
  const requireProjectSelection = () => {
    if (isProjectLocked) {
      setErrorMessage('กรุณาเลือกโครงการก่อนจัดการข้อมูล');
      setShowErrorModal(true);
      return false;
    }
    return true;
  };
  const [showExportModal, setShowExportModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ idx: number; row: TaskRow } | null>(null);
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const [filterActivity, setFilterActivity] = useState("");
  // const [filterStatus, setFilterStatus] = useState(""); // [T-036] Removed
  const [highlightedRow, setHighlightedRow] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [pendingRevCount, setPendingRevCount] = useState(0);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [editNotes, setEditNotes] = useState<Record<number, string>>({});
  const [editAttachments, setEditAttachments] = useState<Record<number, File | null>>({});
  const [editAttachmentErrors, setEditAttachmentErrors] = useState<Record<number, string | null>>({});
  const [editChangesMap, setEditChangesMap] = useState<Record<number, EditChange[]>>({});
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<TaskEditHistoryEntry[]>([]);
  const [historyTaskName, setHistoryTaskName] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPreviewFile, setHistoryPreviewFile] = useState<{ name: string; url: string } | null>(null);
  const [isHistoryPreviewOpen, setIsHistoryPreviewOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // ✅ Added isSaving state

  const formatDisplayValue = (value: any): string => {
    if (value === undefined || value === null) return '-';
    if (value instanceof Timestamp) {
      return formatDate(value);
    }
    if (value instanceof Date) {
      return formatDate(value);
    }
    if (typeof value === 'string') {
      return value.trim() || '-';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  };

  const normalizeTimestamp = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value === 'object' && typeof value.seconds === 'number') {
      return new Date(value.seconds * 1000);
    }
    return null;
  };

  const computeRowChangesBetween = (original: TaskRow | undefined, updated: TaskRow): EditChange[] => {
    if (!original) return [];
    const fields: Array<{ field: keyof TaskRow; label: string }> = [
      { field: 'relateDrawing', label: 'Relate Drawing' },
      { field: 'activity', label: 'Activity' },
      { field: 'startDate', label: 'Plan Start Date' },
      { field: 'dueDate', label: 'Due Date' },
      { field: 'statusDwg', label: 'Status DWG.' },
      { field: 'docNo', label: 'Doc. No.' },
      { field: 'link', label: 'Link File' },
    ];

    const changes: EditChange[] = [];
    fields.forEach(({ field, label }) => {
      const before = formatDisplayValue(original[field]);
      const after = formatDisplayValue(updated[field]);
      if (before !== after) {
        changes.push({ field: String(field), label, before, after });
      }
    });
    return changes;
  };

  const getRowChanges = (idx: number, rowOverride?: TaskRow): EditChange[] => {
    const original = originalRows.get(idx);
    if (!original) return [];
    const currentRow = rowOverride ?? rows[idx];
    const cached = editChangesMap[idx];
    return cached ?? computeRowChangesBetween(original, currentRow);
  };

  const handleEditNoteChange = (idx: number, note: string) => {
    if (isProjectLocked) {
      return;
    }
    setEditNotes(prev => ({ ...prev, [idx]: note }));
    if (note.trim()) {
      markRowEdited(idx);
    }
  };

  const handleEditAttachmentChange = (idx: number, file: File | null) => {
    if (isProjectLocked) {
      return;
    }
    const MAX_MB = 25;
    if (!file) {
      setEditAttachments(prev => {
        const newMap = { ...prev };
        delete newMap[idx];
        return newMap;
      });
      setEditAttachmentErrors(prev => {
        const newMap = { ...prev };
        delete newMap[idx];
        return newMap;
      });
      markRowEdited(idx);
      return;
    }

    if (file.size > MAX_MB * 1024 * 1024) {
      setEditAttachmentErrors(prev => ({ ...prev, [idx]: `ขนาดไฟล์ต้องไม่เกิน ${MAX_MB}MB` }));
      setEditAttachments(prev => ({ ...prev, [idx]: null }));
      return;
    }

    setEditAttachments(prev => ({ ...prev, [idx]: file }));
    markRowEdited(idx);
    setEditAttachmentErrors(prev => {
      const newMap = { ...prev };
      delete newMap[idx];
      return newMap;
    });
  };

  const formatDateTime = (date: Date | null): string => {
    if (!date) return '-';
    return `${date.toLocaleDateString('th-TH')} ${date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const normalizeHistoryFields = (fields: any): EditChange[] => {
    if (!Array.isArray(fields)) return [];
    return fields.map((field: any) => {
      if (typeof field === 'string') {
        const [labelPart, rest] = field.split(':');
        const [beforePart, afterPart] = rest ? rest.split('→') : ['', ''];
        const label = labelPart?.trim() || 'Field';
        const before = beforePart?.replace(/"/g, '').trim() || '-';
        const after = afterPart?.replace(/"/g, '').trim() || '-';
        return { field: label, label, before, after };
      }
      const label = field?.label || field?.field || 'Field';
      const before = formatDisplayValue(field?.before ?? field?.oldValue ?? '-');
      const after = formatDisplayValue(field?.after ?? field?.newValue ?? '-');
      return {
        field: field?.field || label,
        label,
        before,
        after,
      };
    });
  };

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

  // ✅ Fetch Projects via Cache
  useEffect(() => {
    const loadProjects = async () => {
      if (projects.length > 0) return; // Already loaded from cache

      setLoading(true);
      try {
        await fetchProjects();
      } catch (error) {
        console.error("Error loading projects:", error);
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, [fetchProjects, projects.length]);

  // ✅ Fetch Tasks via Cache when project selected
  useEffect(() => {
    const loadTasks = async () => {
      setTasksLoading(true); // [T-004-E9] Always show loader start

      try {
        if (selectedProject === "all") {
          if (projects.length > 0 && !cacheLoaded) {
            await Promise.all(projects.map(p => refreshTasks(p.id)));
            setCacheLoaded(true);
          }
        } else {
          // Even if cached, we await slightly or just ensure fetch request completes (if invalid)
          // But since we want to show spinner even for cached switch (user request), let's ensure it stays true for a tick
          if (!tasksCache[selectedProject]) {
            await refreshTasks(selectedProject);
          } else {
            // Optional: Short delay if user insists on seeing spinner for cached data context switch
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      } catch (error) {
        console.error("Error loading tasks:", error);
      } finally {
        setTasksLoading(false);
      }
    };
    if (projects.length > 0) {
      loadTasks();
    }
  }, [selectedProject, projects, refreshTasks, cacheLoaded]);

  // [T-004-E8-3] Force clear rows when project changes to prevent ghost data
  useEffect(() => {
    setRows(initialRows);
  }, [selectedProject]);

  // Combined Tasks for "All" view or Specific Project
  const currentTasks = useMemo(() => {
    if (selectedProject !== "all") {
      return tasksCache[selectedProject] || [];
    }
    return Object.values(tasksCache).flat();
  }, [selectedProject, tasksCache]);

  // Replace allTasksCache usage with currentTasks
  const allTasksCache = currentTasks;


  useEffect(() => {
    if (!cacheLoaded || allTasksCache.length === 0) return;

    let filteredTasks = allTasksCache;
    if (selectedProject !== "all") {
      filteredTasks = filteredTasks.filter(t => t.projectId === selectedProject);
    }
    if (filterActivity) {
      filteredTasks = filteredTasks.filter(t => t.taskCategory === filterActivity);
    }

    // [T-034] Consolidated Status Filter Logic (Top Filter OR Header Filter)
    // If usage is likely "Either/Or", we can prioritize them or AND them.
    // User requested "Top Filter is broken". Let's make it work.
    // Logic: If Top Filter is set, apply it. If Header Filter is set, apply it. (AND Logic if both?)
    // Usually standard is: Global Filter (Top) AND Column Filter (Header).

    const applyStatusFilter = (tasks: (Task & { id: string })[], statuses: string[]) => {
      if (statuses.length === 0) return tasks;

      return tasks.filter(t => {
        // [T-035] Refined Filter Logic
        // Check exact match for Work Request statuses
        let currentStep = t.currentStep || '';

        // [T-048-E1] Fallback: If Work Request has NO step, assume it is PENDING_BIM (New)
        if (!currentStep && t.taskCategory === 'Work Request') {
          currentStep = 'PENDING_BIM';
        }

        const matchStep = statuses.includes(currentStep);

        // Check Category match for RFA
        const category = getTaskStatusCategory(t);
        const matchCategory = statuses.includes(category);

        if (matchStep) return true;
        if (matchCategory) return true;

        return false;
      });
    };

    // Top Multi-Select Filter
    if (selectedStatuses.length > 0) {
      filteredTasks = applyStatusFilter(filteredTasks, selectedStatuses);
    }

    // [T-034] Search Logic
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filteredTasks = filteredTasks.filter(t =>
        (t.taskName || "").toLowerCase().includes(lowerTerm) ||
        (t.taskNumber || "").toLowerCase().includes(lowerTerm)
      );
    }

    // [T-037] Sorting Logic
    if (sortConfig) {
      filteredTasks.sort((a, b) => {
        let aValue: any = '';
        let bValue: any = '';

        switch (sortConfig.key) {
          case 'id': aValue = a.id || ''; bValue = b.id || ''; break;
          case 'relateDrawing': aValue = a.taskName || ''; bValue = b.taskName || ''; break;
          case 'planStartDate': aValue = a.planStartDate ? (a.planStartDate.seconds * 1000) : 0; bValue = b.planStartDate ? (b.planStartDate.seconds * 1000) : 0; break;
          case 'dueDate': aValue = a.dueDate ? (a.dueDate.seconds * 1000) : 0; bValue = b.dueDate ? (b.dueDate.seconds * 1000) : 0; break;
          case 'statusDwg':
            const getStatusSortValue = (t: any) => {
              const isWR = ['PENDING_BIM', 'IN_PROGRESS', 'PENDING_ACCEPTANCE', 'REVISION_REQUESTED', 'COMPLETED'].includes(t.currentStep);
              return isWR ? (t.currentStep || '') : getTaskStatusCategory(t);
            };
            aValue = getStatusSortValue(a);
            bValue = getStatusSortValue(b);
            break;
          default: break;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const taskRows = filteredTasks.map(task => convertTaskToRow(task));
    setRows([...initialRows, ...taskRows]); // [T-050] Move NEW row to top
    setEditingRows(new Set());
    setEditedRows(new Set());
    setOriginalRows(new Map());
    setEditNotes({});
    setEditAttachments({});
    setEditAttachmentErrors({});
    setEditChangesMap({});
  }, [cacheLoaded, allTasksCache, selectedProject, filterActivity, selectedStatuses, searchTerm, sortConfig]);

  useEffect(() => {
    // [T-004-E8-2] Allow updates for specific projects even if global cache isn't fully loaded
    if (selectedProject === 'all' && !cacheLoaded) return;

    let tasksToCheck = allTasksCache;
    if (selectedProject !== "all") {
      tasksToCheck = allTasksCache.filter(t => t.projectId === selectedProject);
    }

    const needsRevision = tasksToCheck.filter(t => {
      const isWorkRequest = t.taskCategory === 'Work Request';

      // ✅ เงื่อนไข 1: เช็คสถานะตามประเภทเอกสาร
      if (isWorkRequest) {
        // Work Request: ต้องเป็นสถานะ REVISION_REQUESTED
        if (t.currentStep !== 'REVISION_REQUESTED') {
          return false;
        }
      } else {
        // เอกสาร RFA: ต้องเป็นสถานะ APPROVED_REVISION_REQUIRED หรือ REJECTED
        if (t.currentStep !== 'APPROVED_REVISION_REQUIRED' && t.currentStep !== 'REJECTED') {
          return false;
        }
      }

      // ✅ เงื่อนไข 2: เช็คว่ามี Rev. ถัดไปในระบบแล้วหรือยัง
      const baseName = t.taskName.replace(/\s+REV\.\d+$/i, '');
      const currentRev = parseInt(t.rev || '0');
      const nextRev = String(currentRev + 1).padStart(2, '0');
      const nextRevName = `${baseName} REV.${nextRev}`;

      const hasNextRev = tasksToCheck.some(task =>
        task.taskName === nextRevName ||
        (task.taskName.replace(/\s+REV\.\d+$/i, '') === baseName &&
          parseInt(task.rev || '0') > currentRev)
      );

      return !hasNextRev;
    });

    setPendingRevCount(needsRevision.length);
  }, [allTasksCache, cacheLoaded, selectedProject]);

  const handleCreateProject = async (projectData: { name: string; code: string; leader: string }) => {
    try {
      await createProject(projectData);
      setIsCreateModalOpen(false);
      await fetchProjects(true); // [Refactor] Refresh cache instead of local state

      // --- ส่วนที่แก้ไข: เรียกใช้ SuccessModal ---
      setSuccessMessage('สร้างโปรเจกต์สำเร็จ');
      setShowSuccessModal(true);
      // ------------------------------------

    } catch (error) {
      console.error('Error creating project:', error);

      // --- ส่วนที่แก้ไข: เรียกใช้ ErrorModal ---
      setErrorMessage('เกิดข้อผิดพลาดในการสร้างโปรเจกต์');
      setShowErrorModal(true);
      // ------------------------------------
    }
  };

  const handleUpdateLeader = async (projectId: string, newLeader: string) => {
    try {
      await updateProjectLeader(projectId, newLeader);
      await fetchProjects(true); // [Refactor] Refresh cache

      // --- ส่วนที่แก้ไข ---
      setSuccessMessage('อัพเดท Leader สำเร็จ');
      setShowSuccessModal(true);
      // --------------------

    } catch (error) {
      console.error('Error updating leader:', error);

      // --- ส่วนที่แก้ไข ---
      setErrorMessage('เกิดข้อผิดพลาดในการอัพเดท Leader');
      setShowErrorModal(true);
      // --------------------
    }
  };

  const markRowEdited = (idx: number) => {
    const row = rows[idx];
    if (!row?.firestoreId) return;
    setEditedRows(prev => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  };

  const handleRowChange = (idx: number, field: keyof TaskRow, value: string | boolean) => {
    if (isProjectLocked) {
      return;
    }
    setRows(prevRows => {
      const updatedRows = prevRows.map((row, i) => i === idx ? { ...row, [field]: value } : row);
      if (originalRows.has(idx)) {
        const changes = computeRowChangesBetween(originalRows.get(idx), updatedRows[idx]);
        setEditChangesMap(prev => ({ ...prev, [idx]: changes }));
      }
      return updatedRows;
    });
    markRowEdited(idx);
  };

  const handleViewHistory = async (idx: number) => {
    const row = rows[idx];
    if (!row) return;
    setHistoryTaskName(row.relateDrawing || row.id || 'ไม่พบชื่อเอกสาร');
    if (!row.firestoreId) {
      setHistoryEntries([]);
      setHistoryModalOpen(true);
      return;
    }

    try {
      setHistoryLoading(true);
      const history = await getTaskEditHistory(row.firestoreId);
      const normalized = (history || [])
        .map((entry: TaskEditHistoryEntry) => {
          const timestamp = normalizeTimestamp(entry.timestamp) || undefined;
          const fileUploadedAt = normalizeTimestamp(entry.fileUploadedAt) || undefined;
          const fields = normalizeHistoryFields(entry.fields);
          return {
            ...entry,
            timestamp,
            fileUploadedAt,
            fields,
          } as TaskEditHistoryEntry;
        })
        .sort((a, b) => {
          const timeA = normalizeTimestamp(a.timestamp)?.getTime() || 0;
          const timeB = normalizeTimestamp(b.timestamp)?.getTime() || 0;
          return timeB - timeA;
        });

      setHistoryEntries(normalized);
      setHistoryModalOpen(true);
    } catch (error) {
      console.error('Error loading history:', error);
      setErrorMessage('ไม่สามารถโหลดประวัติการแก้ไขได้');
      setShowErrorModal(true);
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistoryModal = () => {
    setHistoryModalOpen(false);
    setHistoryEntries([]);
    setHistoryTaskName('');
    setHistoryLoading(false);
    setHistoryPreviewFile(null);
    setIsHistoryPreviewOpen(false);
  };

  const attachmentErrorsPresent = useMemo(() => Object.values(editAttachmentErrors).some(Boolean), [editAttachmentErrors]);
  const saveDisabled = attachmentErrorsPresent || isProjectLocked || isSaving; // ✅ Added isSaving check

  const handleSaveEditRow = (idx: number) => {
    if (isProjectLocked) {
      return;
    }
    const original = originalRows.get(idx);
    const currentRow = rows[idx];
    const computedChanges = computeRowChangesBetween(original, currentRow);
    setEditChangesMap(prev => ({ ...prev, [idx]: computedChanges }));
    const note = (editNotes[idx] || '').trim();
    const attachment = editAttachments[idx] || null;
    if (computedChanges.length > 0 || note || attachment) {
      markRowEdited(idx);
    } else {
      setEditedRows(prev => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
      setEditChangesMap(prev => {
        const next = { ...prev };
        delete next[idx];
        return next;
      });
      setEditNotes(prev => {
        const next = { ...prev };
        delete next[idx];
        return next;
      });
      setEditAttachments(prev => {
        const next = { ...prev };
        delete next[idx];
        return next;
      });
      setEditAttachmentErrors(prev => {
        const next = { ...prev };
        delete next[idx];
        return next;
      });
    }
    setEditingRows(prev => {
      const next = new Set(prev);
      next.delete(idx);
      return next;
    });
  };

  const handleRowFocus = (idx: number) => {
    if (isProjectLocked) {
      return;
    }
    if (!touchedRows.has(idx)) {
      setTouchedRows(prev => new Set(prev).add(idx));
      setRows(rows => {
        if (!rows[idx + 1]) {
          return [...rows, { ...initialRows[0] }];
        }
        return rows;
      });
    }
  };

  // ========== ✅ MERGED: เพิ่มการป้องกันลบ Work Request ==========
  const handleDelete = (idx: number) => {
    if (!requireProjectSelection()) {
      return;
    }
    const rowToDelete = rows[idx];

    const showError = (message: string) => {
      setErrorMessage(message);
      setShowErrorModal(true);
    };

    if (rowToDelete.activity === 'Work Request') {
      showError('ไม่สามารถลบงานที่เป็น Work Request ได้');
      return;
    }

    const isEmptyRow = !rowToDelete.id && !rowToDelete.relateDrawing && !rowToDelete.activity && !rowToDelete.startDate && !rowToDelete.dueDate;

    if (isEmptyRow && idx === rows.length - 1) {
      showError('ไม่สามารถลบแถวว่างแถวสุดท้ายได้');
      return;
    }

    if (rowToDelete.statusDwg) {
      showError('ไม่สามารถลบแถวที่มีสถานะเอกสารแล้วได้');
      return;
    }

    if (rowToDelete.progress && rowToDelete.progress > 0) {
      showError('ไม่สามารถลบงานที่มีความคืบหน้าแล้วได้');
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
        // [T-053] Immediately refresh cache
        if (selectedProject && selectedProject !== 'all') {
          await refreshTasks(selectedProject, true);
        }
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
      setEditingRows(prev => { const newSet = new Set(prev); newSet.delete(idx); return newSet; });
      setEditedRows(prev => { const newSet = new Set(prev); newSet.delete(idx); return newSet; });
      setOriginalRows(prev => { const newMap = new Map(prev); newMap.delete(idx); return newMap; });
    } catch (error) {
      console.error('❌ Error deleting:', error);
      setErrorMessage('เกิดข้อผิดพลาดในการลบข้อมูล');
      setShowErrorModal(true);
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const handleSave = async () => {
    const showError = (message: string) => {
      setErrorMessage(message);
      setShowErrorModal(true);
    };

    if (!selectedProject || selectedProject === "all") {
      showError('กรุณาเลือกโครงการก่อนทำการบันทึก');
      return;
    }
    const currentProject = projects.find(p => p.id === selectedProject);
    if (!currentProject || !currentProject.abbr) {
      showError('ไม่พบข้อมูลโครงการที่เลือก');
      return;
    }
    const rowsToUpdate: Array<{ row: TaskRow; idx: number; changeDetails: EditChange[] }> = [];
    const rowsToCreate: TaskRow[] = [];
    rows.forEach((row, idx) => {
      if (!row.relateDrawing || !row.activity || !row.startDate || !row.dueDate) return;
      if (row.firestoreId && editedRows.has(idx)) {
        const original = originalRows.get(idx);
        const changeDetails = computeRowChangesBetween(original, row);
        const note = (editNotes[idx] || '').trim();
        const attachment = editAttachments[idx] || null;
        if (changeDetails.length > 0 || note || attachment) {
          rowsToUpdate.push({ row, idx, changeDetails });
          setEditChangesMap(prev => ({ ...prev, [idx]: changeDetails }));
        }
      } else if (!row.firestoreId) {
        rowsToCreate.push(row);
      }
    });
    if (rowsToUpdate.length === 0 && rowsToCreate.length === 0) {
      showError('ไม่มีข้อมูลใหม่หรือการเปลี่ยนแปลงที่จะบันทึก');
      return;
    }
    const modalData = {
      updated: rowsToUpdate.map(({ row, idx, changeDetails }) => {
        const changeStrings = changeDetails.length
          ? changeDetails.map(change => `${change.label}: ${change.before} → ${change.after}`)
          : ['ไม่มีการเปลี่ยนแปลง'];
        const note = (editNotes[idx] || '').trim();
        if (note) {
          changeStrings.push(`หมายเหตุ: ${note}`);
        }
        return { id: row.id, name: row.relateDrawing, changes: changeStrings, rowIdx: idx };
      }),
      created: rowsToCreate.map(r => ({ id: '(จะสร้างใหม่)', name: r.relateDrawing, changes: [`Activity: ${r.activity}`, `วันเริ่มตามแผน: ${r.startDate}`, `วันครบกำหนด: ${r.dueDate}`] }))
    };
    const hasAttachmentErrors = Object.values(editAttachmentErrors).some(Boolean);
    if (hasAttachmentErrors) {
      showError('กรุณาแก้ไขไฟล์แนบที่ไม่ถูกต้องก่อนบันทึก');
      return;
    }

    setSaveModalData(modalData);
    setShowSaveModal(true);
  };

  const handleOpenAddRevModal = () => {
    if (!requireProjectSelection()) {
      return;
    }
    setShowAddRevModal(true);
  };

  const handleOpenImportModal = () => {
    if (!requireProjectSelection()) {
      return;
    }
    setShowImportModal(true);
  };

  const handleOpenExportModal = () => {
    if (!requireProjectSelection()) {
      return;
    }
    setShowExportModal(true);
  };

  const handleOpenDeletedModal = () => {
    if (!requireProjectSelection()) {
      return;
    }
    setShowDeletedModal(true);
  };

  const confirmSave = async () => {
    // setShowSaveModal(false); // ❌ Don't close immediately
    try {
      setIsSaving(true); // ✅ Start saving state
      const currentProject = projects.find(p => p.id === selectedProject);
      if (!currentProject) return;
      const updatePromises = saveModalData.updated.map(async (updatedItem) => {
        const rowIdx = updatedItem.rowIdx !== undefined ? updatedItem.rowIdx : rows.findIndex(r => r.id === updatedItem.id);
        if (rowIdx === -1) return;
        const row = rows[rowIdx];
        if (!row || !row.firestoreId) return;

        const changeDetails = getRowChanges(rowIdx, row);
        const note = (editNotes[rowIdx] || '').trim();
        let attachmentInfo: { cdnURL: string; storagePath: string; fileUploadedAt: Timestamp; fileName: string } | null = null;
        const attachmentFile = editAttachments[rowIdx] || null;
        if (attachmentFile) {
          attachmentInfo = await uploadTaskEditAttachment(attachmentFile, row.firestoreId);
        }

        const editorName = appUser?.fullName || appUser?.username || appUser?.employeeId || 'unknown';
        const historyEntry: any = {
          timestamp: Timestamp.now(),
          fields: changeDetails,
          taskId: row.firestoreId,
          taskNumber: row.id,
          user: editorName,
        };
        if (note) {
          historyEntry.note = note;
        }

        if (attachmentInfo) {
          historyEntry.fileURL = attachmentInfo.cdnURL;
          historyEntry.storagePath = attachmentInfo.storagePath;
          historyEntry.fileName = attachmentInfo.fileName;
          historyEntry.fileUploadedAt = attachmentInfo.fileUploadedAt;
        }

        const shouldRecordHistory = changeDetails.length > 0 || note || attachmentInfo;

        await updateTask(
          row.firestoreId,
          {
            taskName: row.relateDrawing,
            taskCategory: row.activity,
            planStartDate: row.startDate ? Timestamp.fromDate(new Date(row.startDate)) : null,
            dueDate: row.dueDate ? Timestamp.fromDate(new Date(row.dueDate)) : null,
          } as any,
          shouldRecordHistory ? historyEntry : undefined
        );

        setEditNotes(prev => {
          const newMap = { ...prev };
          delete newMap[rowIdx];
          return newMap;
        });
        setEditAttachments(prev => {
          const newMap = { ...prev };
          delete newMap[rowIdx];
          return newMap;
        });
        setEditAttachmentErrors(prev => {
          const newMap = { ...prev };
          delete newMap[rowIdx];
          return newMap;
        });
        setEditChangesMap(prev => {
          const newMap = { ...prev };
          delete newMap[rowIdx];
          return newMap;
        });
      });
      await Promise.all(updatePromises);
      let finalRows = [...rows];
      const rowsToCreate = rows.filter(r => !r.firestoreId && !r.id && r.relateDrawing && r.activity);

      // ✅ ========== โค้ดส่วนที่แก้ไขแล้ว ========== ✅
      if (rowsToCreate.length > 0) {
        const createdRows: TaskRow[] = [];

        // เราต้องใช้ for...of loop เพราะเราต้อง 'await' ทีละตัว
        // เพื่อให้เลข counter ที่ได้จาก server ไม่ซ้ำกัน
        for (const row of rowsToCreate) {
          try {
            // 1. โทรหา Backend เพื่อขอเลขใหม่ (Atomic)
            const newCounter = await getNextTaskCounter(selectedProject);

            // 2. สร้าง ID โดยใช้เลขที่ปลอดภัยแล้ว
            const taskId = generateTaskId(currentProject.abbr, row.activity, rows, activities, newCounter);

            // 3. สร้าง Task (ซึ่งจะใช้ taskId เป็น Document ID)
            await createTask(selectedProject, { ...row, id: taskId, rev: row.lastRev || '00' });

            // 4. เก็บผลลัพธ์เพื่ออัปเดตตาราง
            createdRows.push({ ...row, id: taskId, firestoreId: taskId }); // firestoreId ก็คือ taskId

          } catch (error) {
            console.error("Error creating task one by one:", error);
            // หยุดการสร้างทันทีถ้ามีข้อผิดพลาด
            throw new Error(`Failed to create task: ${row.relateDrawing}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        // ✅ ========== สิ้นสุดโค้ดที่แก้ไขแล้ว ========== ✅

        finalRows = rows.map(row => {
          const created = createdRows.find(cr => cr.relateDrawing === row.relateDrawing && !row.firestoreId);
          return created || row;
        });
        setRows(finalRows);
      }
      setSuccessMessage(`บันทึกสำเร็จ ${saveModalData.updated.length} รายการแก้ไข และ ${rowsToCreate.length} รายการใหม่`);

      // [T-053] Immediately refresh cache
      if (selectedProject && selectedProject !== 'all') {
        await refreshTasks(selectedProject, true);
      }

      setShowSuccessModal(true);
      setShowSaveModal(false); // ✅ Close modal on success
      setEditingRows(new Set());
      setEditedRows(new Set());
      setOriginalRows(new Map());
      setEditNotes({});
      setEditAttachments({});
      setEditAttachmentErrors({});
      setEditChangesMap({});
    } catch (error) {
      console.error('❌ Error saving:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage('เกิดข้อผิดพลาดในการบันทึก: ' + errorMessage);
      setShowErrorModal(true);
      setShowSaveModal(false); // ✅ Close modal on error
    } finally {
      setIsSaving(false); // ✅ Reset saving state
    }
  };

  // ========== ✅ MERGED: เพิ่มการป้องกันแก้ไข Work Request ==========
  const handleEdit = (idx: number) => {
    if (!requireProjectSelection()) {
      return;
    }
    const row = rows[idx];
    const isWorkRequest = row.activity === 'Work Request';

    // ✅ Work Request: แก้ไขได้เฉพาะสถานะ PENDING_BIM
    if (isWorkRequest && row.statusDwg !== 'PENDING_BIM') {
      alert('⚠️ แก้ไข Work Request ได้เฉพาะสถานะ "รอ BIM รับงาน" เท่านั้น\n\nถ้าสถานะเป็น "ขอแก้ไข" → กรุณาคลิกปุ่ม "Add new Rev." เพื่อสร้างแถวใหม่');
      return;
    }

    setOriginalRows(prev => {
      const newMap = new Map(prev);
      if (!prev.has(idx)) {
        newMap.set(idx, { ...rows[idx] });
      }
      return newMap;
    });
    setEditingRows(prev => new Set(prev).add(idx));
    setEditNotes(prev => ({ ...prev, [idx]: prev[idx] ?? '' }));
    setEditAttachments(prev => {
      const newMap = { ...prev };
      delete newMap[idx];
      return newMap;
    });
    setEditAttachmentErrors(prev => {
      const newMap = { ...prev };
      delete newMap[idx];
      return newMap;
    });
    setEditChangesMap(prev => ({ ...prev, [idx]: [] }));
  };

  // ✅ 1. แก้ไขชื่อฟังก์ชัน (เพิ่ม _) เพื่อแก้ Warning
  const _handleCancelEdit = (idx: number) => {
    const original = originalRows.get(idx);
    if (original) {
      setRows(rows => rows.map((row, i) => i === idx ? original : row));
    }
    setEditingRows(prev => { const newSet = new Set(prev); newSet.delete(idx); return newSet; });
    setEditedRows(prev => { const newSet = new Set(prev); newSet.delete(idx); return newSet; });
    setEditNotes(prev => {
      const newMap = { ...prev };
      delete newMap[idx];
      return newMap;
    });
    setEditAttachments(prev => {
      const newMap = { ...prev };
      delete newMap[idx];
      return newMap;
    });
    setEditAttachmentErrors(prev => {
      const newMap = { ...prev };
      delete newMap[idx];
      return newMap;
    });
    setEditChangesMap(prev => {
      const newMap = { ...prev };
      delete newMap[idx];
      return newMap;
    });
  };

  const handleExport = async (options: any) => {
    const showError = (message: string) => {
      setErrorMessage(message);
      setShowErrorModal(true);
    };
    try {
      if (options.exportType === 'gantt') {
        const project = projects.find(p => p.id === (options.projectId === 'all' ? selectedProject : options.projectId));
        const projectName = project?.name || 'All Projects';
        const projectLead = project?.projectAssignee || 'N/A';
        let filteredRows = rows.filter(r => r.relateDrawing && r.relateDrawing.trim() !== '' && r.startDate && r.dueDate);
        if (filteredRows.length === 0) {
          showError('ไม่มีข้อมูลที่จะ Export\n\nกรุณาตรวจสอบว่ามีงานที่มีวันเริ่มและวันสิ้นสุดครบถ้วน');
          return;
        }
        let start: Date, end: Date;
        if (options.startDate && options.endDate) {
          start = new Date(options.startDate);
          end = new Date(options.endDate);

          // ✅ 2. ลบบรรทัด 'beforeFilter' ที่ไม่ได้ใช้งาน
          // const beforeFilter = filteredRows.length; // <--- ลบบรรทัดนี้

          filteredRows = filteredRows.filter(r => {
            const taskStart = new Date(r.startDate);
            const taskEnd = new Date(r.dueDate);
            return taskStart <= end && taskEnd >= start;
          });
          if (filteredRows.length === 0) {
            showError(`ไม่มีงานในช่วง ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`);
            return;
          }
        } else {
          const dates = filteredRows.flatMap(r => [new Date(r.startDate).getTime(), new Date(r.dueDate).getTime()]);
          start = new Date(Math.min(...dates));
          end = new Date(Math.max(...dates));
        }
        await exportGanttChart(filteredRows.map(r => ({ id: r.id, relateDrawing: r.relateDrawing, activity: r.activity, startDate: r.startDate, dueDate: r.dueDate, progress: r.progress || 0, statusDwg: r.statusDwg || '' })), projectName, projectLead, start, end);
        setSuccessMessage(`Export Gantt Chart สำเร็จ! (${filteredRows.length} tasks)`);
        setShowSuccessModal(true);
      } else {
        // สำหรับ 'Simple export coming soon!' อาจจะใช้ Modal หรือคง alert ไว้ก็ได้ถ้าต้องการให้ดูเป็น temporary
        showError('ฟังก์ชัน Export แบบทั่วไปยังไม่เปิดให้บริการ');
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      const message = error instanceof Error ? error.message : String(error);
      showError('เกิดข้อผิดพลาดในการ Export:\n' + message);
    }
  };

  const handleSelectTaskForRevision = (task: any) => {
    const relatedTasks = rows.filter(r => r.relateDrawing.startsWith(task.taskName.replace(/\sREV\.\d+$/, '')));
    const maxRev = relatedTasks.reduce((max, r) => {
      const revMatch = r.lastRev?.match(/\d+/);
      return revMatch ? Math.max(max, parseInt(revMatch[0])) : max;
    }, 0);
    const nextRev = String(maxRev + 1).padStart(2, '0');
    const originalRow = rows.find(r => r.id === task.id);
    const docNo = originalRow?.docNo || "";
    const newRow = { id: "", relateDrawing: `${task.taskName} REV.${nextRev}`, activity: task.taskCategory, startDate: "", dueDate: "", statusDwg: "", lastRev: nextRev, docNo: docNo, link: "", progress: 0, correct: false };
    const nonEmptyRows = rows.filter(r => r.relateDrawing || r.activity);
    setRows([...nonEmptyRows, newRow, initialRows[0]]);
    setHighlightedRow(nonEmptyRows.length);
    setTimeout(() => setHighlightedRow(null), 2000);
  };

  const handleRestoreComplete = async () => {
    try {
      if (selectedProject !== "all") {
        await refreshTasks(selectedProject, true);
      } else {
        await Promise.all(projects.map(p => refreshTasks(p.id, true)));
      }
      setSuccessMessage('รีโหลดข้อมูลที่ถูกลบเรียบร้อยแล้ว');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error reloading tasks:', error);
      setErrorMessage('เกิดข้อผิดพลาดในการรีโหลดข้อมูล');
      setShowErrorModal(true);
    }
  };



  // [T-037] Sort Helpers
  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIndicator = (key: string) => {
    if (sortConfig?.key !== key) return <span style={{ color: '#ffffff80', fontSize: '10px' }}>⇅</span>;
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <div style={{ maxWidth: "100%", margin: "35px auto 0 auto" }}>
        <div style={{ marginBottom: "24px", display: "flex", gap: "16px", alignItems: "center" }}>
          <button onClick={() => setIsCreateModalOpen(true)} style={{ padding: "8px 16px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", color: "#374151", fontWeight: 500 }}>
            <span style={{ color: "#6366f1", fontWeight: "bold" }}>+</span> สร้างโครงการใหม่
          </button>
          <button onClick={() => setIsUserModalOpen(true)} style={{ padding: "8px 16px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", color: "#374151", fontWeight: 500 }}>
            <span style={{ color: "#6366f1", fontWeight: "bold" }}>👥</span> จัดการสมาชิก
          </button>
          <CreateProjectModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreateProject} onViewProjects={() => { setIsCreateModalOpen(false); setIsProjectListOpen(true); }} />
          <ProjectListModal isOpen={isProjectListOpen} onClose={() => setIsProjectListOpen(false)} projects={projects} onUpdateLeader={handleUpdateLeader} />
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} disabled={loading} style={{ padding: "8px 12px", width: "200px", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "14px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", backgroundColor: loading ? "#f3f4f6" : "#fff", color: "#374151", cursor: loading ? "not-allowed" : "pointer" }}>
            <option value="all">ทุกโครงการ</option>
            {projects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>

          {/* [T-034] Search Input */}
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="🔍 ค้นหาชื่อแบบ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "8px 12px 8px 30px", // space for icon if we had one inside, or just padding
                width: "200px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "14px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
            />
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#9ca3af" }}>🔍</span>
          </div>

          {/* [T-035] Reset Filter Button */}
          {(selectedStatuses.length > 0 || searchTerm) && (
            <button
              onClick={() => {
                setSelectedStatuses([]);
                setSearchTerm("");
                // setFilterStatus(""); // [T-036] Removed
              }}
              style={{
                padding: "8px 12px",
                background: "#fee2e2",
                border: "1px solid #fecaca",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#dc2626",
                cursor: "pointer",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              🔄 Reset Filter
            </button>
          )}

          {/* [T-035] Multi-Select Custom Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              style={{
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                background: "#fff",
                cursor: "pointer",
                minWidth: "180px",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "150px" }}>
                {selectedStatuses.length === 0 ? "สถานะ (ทั้งหมด)" : `เลือกแล้ว (${selectedStatuses.length})`}
              </span>
              <span style={{ fontSize: "10px", color: "#666" }}>▼</span>
            </button>

            {isStatusDropdownOpen && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: "4px",
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                width: "240px",
                zIndex: 50,
                maxHeight: "300px",
                overflowY: "auto"
              }}>
                {/* [T-048] Select All Option */}
                <div
                  onClick={() => {
                    if (selectedStatuses.length === 0) {
                      // Select All
                      const allStatuses = [
                        ...['PENDING_BIM', 'IN_PROGRESS', 'PENDING_ACCEPTANCE', 'REVISION_REQUESTED', 'COMPLETED'],
                        ...STATUS_CATEGORIES
                      ];
                      setSelectedStatuses(allStatuses);
                    } else {
                      // Deselect All
                      setSelectedStatuses([]);
                    }
                  }}
                  style={{ padding: "8px 12px", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f3f4f6", fontWeight: 600, color: "#4b5563" }}
                >
                  <input
                    type="checkbox"
                    checked={
                      selectedStatuses.length === (['PENDING_BIM', 'IN_PROGRESS', 'PENDING_ACCEPTANCE', 'REVISION_REQUESTED', 'COMPLETED'].length + STATUS_CATEGORIES.length)
                    }
                    readOnly
                    style={{ cursor: "pointer" }}
                  />
                  <span>เลือกทั้งหมด</span>
                </div>

                <div style={{ padding: "8px", borderBottom: "1px solid #f3f4f6", fontSize: "12px", fontWeight: 600, color: "#9ca3af" }}>
                  Work Request
                </div>
                {['PENDING_BIM', 'IN_PROGRESS', 'PENDING_ACCEPTANCE', 'REVISION_REQUESTED', 'COMPLETED'].map(status => {
                  const labelMap: any = { 'PENDING_BIM': 'รอ BIM รับงาน', 'IN_PROGRESS': 'กำลังดำเนินการ', 'PENDING_ACCEPTANCE': 'รอตรวจรับ', 'REVISION_REQUESTED': 'ขอแก้ไข', 'COMPLETED': 'เสร็จสิ้น' };
                  // [T-048] Fix: Check if specific status is selected (using English Key)
                  const isSelected = selectedStatuses.includes(status);
                  return (
                    <div
                      key={status}
                      onClick={() => {
                        setSelectedStatuses(prev =>
                          prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
                        );
                      }}
                      style={{ padding: "8px 12px", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", background: isSelected ? "#eff6ff" : "transparent" }}
                    >
                      <input type="checkbox" checked={isSelected} readOnly style={{ cursor: "pointer" }} />
                      <span>{labelMap[status]}</span>
                    </div>
                  );
                })}

                <div style={{ padding: "8px", borderBottom: "1px solid #f3f4f6", borderTop: "1px solid #f3f4f6", fontSize: "12px", fontWeight: 600, color: "#9ca3af" }}>
                  เอกสาร RFA (Dashboard)
                </div>
                {STATUS_CATEGORIES.map(cat => {
                  const isSelected = selectedStatuses.includes(cat);
                  return (
                    <div
                      key={cat}
                      onClick={() => {
                        setSelectedStatuses(prev =>
                          prev.includes(cat) ? prev.filter(s => s !== cat) : [...prev, cat]
                        );
                      }}
                      style={{ padding: "8px 12px", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", background: isSelected ? "#eff6ff" : "transparent" }}
                    >
                      <input type="checkbox" checked={isSelected} readOnly style={{ cursor: "pointer" }} />
                      <span>{cat}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Backdrop to close dropdown */}
            {isStatusDropdownOpen && (
              <div
                style={{ position: "fixed", inset: 0, zIndex: 40 }}
                onClick={() => setIsStatusDropdownOpen(false)}
              />
            )}
          </div>
        </div>
        <div style={{ background: "#fff", padding: "24px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb" }}>
          <div style={{ marginBottom: "16px", borderBottom: "1px solid #e5e7eb", paddingBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "14px" }}>Project Name</div>
              <div style={{ color: "#666", fontSize: "14px" }}>
                {selectedProject === "all" ? "ทุกโครงการ" : selectedProject ? projects.find(p => p.id === selectedProject)?.name || "ไม่พบโครงการ" : "แสดง ชื่อโครงการ"}
              </div>
            </div>
          </div>
          {tasksLoading ? (<div style={{ textAlign: "center", padding: "40px", color: "#666" }}>กำลังโหลดข้อมูล...</div>) : (
            <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 300px)", position: "relative", border: "1px solid #e5e7eb" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                  <tr style={{ background: "#ff4d00" }}>
                    <th onClick={() => handleSort('id')} style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "140px", cursor: "pointer" }}>
                      TASK ID {getSortIndicator('id')}
                    </th>
                    <th onClick={() => handleSort('relateDrawing')} style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "180px", cursor: "pointer" }}>
                      RELATE DRAWING {getSortIndicator('relateDrawing')}
                    </th>
                    <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "140px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span>ACTIVITY</span>
                        <select value={filterActivity} onChange={e => setFilterActivity(e.target.value)} onClick={e => e.stopPropagation()} style={{ width: "20px", padding: "0", fontSize: "10px", border: "1px solid #fff", borderRadius: "3px", background: "#fff", color: "#000", cursor: "pointer" }}>
                          <option value="">ทั้งหมด</option>
                          {[...new Set(allTasksCache.map(t => t.taskCategory))].filter(Boolean).map(act => (<option key={act} value={act}>{act}</option>))}
                        </select>
                      </div>
                    </th>
                    <th onClick={() => handleSort('planStartDate')} style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "120px", cursor: "pointer" }}>
                      PLAN START DATE {getSortIndicator('planStartDate')}
                    </th>
                    <th onClick={() => handleSort('dueDate')} style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "110px", cursor: "pointer" }}>
                      DUE DATE {getSortIndicator('dueDate')}
                    </th>
                    <th onClick={() => handleSort('statusDwg')} style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "120px", cursor: "pointer" }}>
                      STATUS DWG. {getSortIndicator('statusDwg')}
                    </th>
                    <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "center", color: "white", whiteSpace: "nowrap", minWidth: "70px" }}>LINK FILE</th>
                    <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "120px" }}>DOC. NO.</th>
                    {/* [T-004-E2] Subtask Count Column */}
                    <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "center", color: "white", whiteSpace: "nowrap", minWidth: "70px" }}>SUBTASKS</th>
                    <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "80px" }}>LAST REV.</th>
                    <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "center", color: "white", whiteSpace: "nowrap", minWidth: "90px" }}>CORRECT</th>
                    <th style={{ padding: "8px 12px", width: 40, color: "white" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isNewRow = !row.id;
                    const isEditing = editingRows.has(idx);
                    const isWorkRequest = row.activity === 'Work Request';
                    const isWorkRequestEditable = isWorkRequest && row.statusDwg === 'PENDING_BIM';
                    const isLockRow = isWorkRequest && row.statusDwg !== 'PENDING_BIM';
                    const isEditable = !isProjectLocked && (isNewRow || (isEditing && (!isWorkRequest || isWorkRequestEditable)));
                    const actionsDisabled = isProjectLocked || isLockRow;
                    const changes = getRowChanges(idx, row);
                    const noteValue = editNotes[idx] ?? '';
                    const attachmentFile = editAttachments[idx] || null;
                    const attachmentError = editAttachmentErrors[idx] || null;

                    return (
                      <React.Fragment key={row.firestoreId || `row-${idx}`}>
                        <tr style={{
                          borderBottom: "1px solid #e5e7eb",
                          background: highlightedRow === idx
                            ? "#fef08a"
                            : isWorkRequest
                              ? "#fef9c3"
                              : isEditing
                                ? "#fff7ed"
                                : idx % 2 === 0
                                  ? "#f9fafb"
                                  : "#fff",
                          transition: "background-color 0.15s ease-out",
                          cursor: isProjectLocked ? "default" : "pointer"
                        }} onMouseEnter={(e) => { if (!isProjectLocked && highlightedRow !== idx && !isEditing) { e.currentTarget.style.backgroundColor = "#e0f2fe"; } }} onMouseLeave={(e) => { if (!isProjectLocked && highlightedRow !== idx && !isEditing) { e.currentTarget.style.backgroundColor = isWorkRequest ? "#fef9c3" : idx % 2 === 0 ? "#f9fafb" : "#fff"; } }}>
                          <td style={{ padding: "4px 6px", fontSize: 10, color: "#2563eb", minWidth: "150px" }}>
                            {isNewRow ? <span style={{ color: "#2563eb", fontWeight: "bold" }}>NEW</span> : row.id}
                          </td>
                          <td style={{ padding: "4px 6px", fontSize: 10, minWidth: "250px" }}>
                            <input type="text" value={row.relateDrawing} onClick={() => handleRowFocus(idx)} onChange={e => handleRowChange(idx, "relateDrawing", e.target.value)} disabled={!isEditable} style={{ width: "100%", padding: "4px 6px", border: "1px solid #e5e7eb", borderRadius: "4px", fontSize: 10, color: "#374151", backgroundColor: !isEditable ? (isWorkRequest ? "#fef9c3" : idx % 2 === 0 ? "#f9fafb" : "#fff") : "#fff", cursor: !isEditable ? "not-allowed" : "text" }} />
                          </td>
                          <td style={{ padding: "6px 10px", fontSize: 10 }}>
                            {isWorkRequest ? (
                              <div style={{ width: "100%", padding: "4px 6px", fontSize: 10, color: "#92400e", fontWeight: 600, backgroundColor: "#fef3c7", border: "1px solid #fbbf24", borderRadius: "4px" }}>
                                Work Request
                              </div>
                            ) : (
                              <select value={row.activity} onClick={() => handleRowFocus(idx)} onChange={e => handleRowChange(idx, "activity", e.target.value)} disabled={activitiesLoading || !isEditable} style={{ width: "100%", padding: "4px 6px", border: "1px solid #e5e7eb", borderRadius: "4px", fontSize: 10, color: "#374151", backgroundColor: !isEditable ? (idx % 2 === 0 ? "#f9fafb" : "#fff") : activitiesLoading ? "#f3f4f6" : "#fff", cursor: !isEditable ? "not-allowed" : activitiesLoading ? "not-allowed" : "pointer" }}>
                                <option value="">{activitiesLoading ? "กำลังโหลด..." : "เลือก Activity"}</option>
                                {activities.map(act => (<option key={act.id} value={act.activityName}>{act.activityName}</option>))}
                              </select>
                            )}
                          </td>
                          <td style={{ padding: "6px 10px", fontSize: 10 }}>
                            <input type="date" value={row.startDate} onClick={() => handleRowFocus(idx)} onChange={e => handleRowChange(idx, "startDate", e.target.value)} disabled={!isEditable} style={{ width: "100%", padding: "4px 6px", border: "1px solid #e5e7eb", borderRadius: "4px", fontSize: 10, backgroundColor: !isEditable ? (isWorkRequest ? "#fef9c3" : idx % 2 === 0 ? "#f9fafb" : "#fff") : "#fff", cursor: !isEditable ? "not-allowed" : "text" }} />
                          </td>
                          <td style={{ padding: "6px 10px", fontSize: 10 }}>
                            <input type="date" value={row.dueDate} onClick={() => handleRowFocus(idx)} onChange={e => handleRowChange(idx, "dueDate", e.target.value)} disabled={!isEditable} style={{ width: "100%", padding: "4px 6px", border: "1px solid #e5e7eb", borderRadius: "4px", fontSize: 10, backgroundColor: !isEditable ? (isWorkRequest ? "#fef9c3" : idx % 2 === 0 ? "#f9fafb" : "#fff") : "#fff", cursor: !isEditable ? "not-allowed" : "text" }} />
                          </td>
                          <td style={{ padding: "4px 6px", fontSize: 10, color: "#2563eb" }}>
                            {row.statusDwg ? translateStatus(row.statusDwg, isWorkRequest) : ""}
                          </td>
                          <td style={{ padding: "4px 6px", fontSize: 10, textAlign: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                            </div>
                          </td>
                          <td style={{ padding: "4px 6px", fontSize: 10 }}>{row.docNo}</td>
                          <td style={{ padding: "4px 6px", fontSize: 10, textAlign: "center" }}>
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {row.subtaskCount || 0}
                            </span>
                          </td>
                          <td style={{ padding: "4px 6px", fontSize: 10, color: "#2563eb", fontWeight: 500 }}>
                            {row.lastRev || "00"}
                          </td>
                          <td style={{ padding: "4px 6px", fontSize: 10, textAlign: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                              {actionsDisabled ? (
                                <div
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "6px",
                                    background: isProjectLocked ? "#e5e7eb" : "#fee2e2",
                                    border: `1px solid ${isProjectLocked ? "#d1d5db" : "#fecaca"}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: isProjectLocked ? "#6b7280" : "#dc2626",
                                    fontSize: "16px",
                                    cursor: "not-allowed"
                                  }}
                                  title={isProjectLocked ? "เลือกรายการโครงการก่อน" : "แถวนี้ไม่อนุญาตให้แก้ไข"}
                                >
                                  🔒
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEdit(idx)}
                                    style={{ width: "28px", height: "28px", borderRadius: "6px", background: "#e0f2fe", border: "1px solid #bfdbfe", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "14px" }}
                                    title="แก้ไข"
                                  >
                                    ✎
                                  </button>
                                  {isEditing && (
                                    <button
                                      onClick={() => handleSaveEditRow(idx)}
                                      style={{ width: "28px", height: "28px", borderRadius: "6px", background: "#10b981", border: "none", color: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "14px", boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)" }}
                                      title="บันทึก"
                                    >
                                      ✔
                                    </button>
                                  )}
                                </>
                              )}
                              {row.firestoreId && (
                                <button
                                  onClick={() => handleViewHistory(idx)}
                                  style={{ width: "28px", height: "28px", borderRadius: "6px", background: "#f3f4f6", border: "1px solid #e5e7eb", cursor: "pointer", color: "#111827", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}
                                  title="ประวัติการแก้ไข"
                                >
                                  🕘
                                </button>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "2px 4px", fontSize: 10, textAlign: "center" }}>
                            {(() => {
                              const isEmptyRow = !row.id && !row.relateDrawing && !row.activity && !row.startDate && !row.dueDate;
                              const isLastEmptyRow = isEmptyRow && idx === rows.length - 1;
                              const hasStatus = !!row.statusDwg;
                              const hasProgress = row.progress && row.progress > 0;
                              if (isProjectLocked) {
                                return <span style={{ color: "#9ca3af" }} title="เลือกรายการโครงการก่อน">🔒</span>;
                              }
                              // [T-049] Refined Delete Logic:
                              // Only hide if it has ACTIVE subtasks.
                              // We assume row.subtaskCount tracks existence of subtasks.
                              // Ignore hasStatus/hasProgress to allow deleting Work Requests.
                              if (isLastEmptyRow || (row.subtaskCount && row.subtaskCount > 0)) {
                                return <span style={{ color: "#9ca3af" }}>-</span>;
                              }
                              return (<button onClick={() => handleDelete(idx)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#ef4444", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }} title="ลบ"><svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>);
                            })()}
                          </td>

                        </tr>
                        {isEditing && (
                          <tr>
                            <td colSpan={11} style={{ background: "#f9fafb", padding: "12px" }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                                <div style={{ flex: "1 1 280px" }}>
                                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#1f2937", marginBottom: "4px" }}>
                                    หมายเหตุการแก้ไข
                                  </label>
                                  <textarea
                                    value={noteValue}
                                    onChange={(e) => handleEditNoteChange(idx, e.target.value)}
                                    rows={3}
                                    style={{ width: "100%", padding: "6px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "12px", color: "#111827", background: "#fff" }}
                                    placeholder="อธิบายเหตุผลหรือรายละเอียดการแก้ไข"
                                  />
                                </div>
                                <div style={{ flex: "1 1 240px" }}>
                                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#1f2937", marginBottom: "4px" }}>
                                    แนบไฟล์อ้างอิง (สูงสุด 25MB)
                                  </label>
                                  <input
                                    type="file"
                                    onChange={(e) => handleEditAttachmentChange(idx, e.target.files?.[0] || null)}
                                    style={{ fontSize: "12px" }}
                                  />
                                  {attachmentFile && (
                                    <p style={{ fontSize: "11px", color: "#4b5563", marginTop: "4px" }}>
                                      {attachmentFile.name} ({(attachmentFile.size / (1024 * 1024)).toFixed(2)} MB)
                                    </p>
                                  )}
                                  {attachmentError && (
                                    <p style={{ fontSize: "11px", color: "#dc2626", marginTop: "4px" }}>{attachmentError}</p>
                                  )}
                                </div>
                              </div>
                              <div style={{ marginTop: "12px" }}>
                                <div style={{ fontSize: "12px", fontWeight: 600, color: "#111827", marginBottom: "6px" }}>ฟิลด์ที่แก้ไข</div>
                                {changes.length > 0 ? (
                                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                                    <thead>
                                      <tr>
                                        <th style={{ padding: "6px", background: "#eff6ff", border: "1px solid #dbeafe", textAlign: "left" }}>ฟิลด์</th>
                                        <th style={{ padding: "6px", background: "#eff6ff", border: "1px solid #dbeafe", textAlign: "left" }}>ก่อนแก้ไข</th>
                                        <th style={{ padding: "6px", background: "#eff6ff", border: "1px solid #dbeafe", textAlign: "left" }}>หลังแก้ไข</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {changes.map((change, changeIdx) => (
                                        <tr key={`change-${idx}-${changeIdx}`}>
                                          <td style={{ padding: "6px", border: "1px solid #e5e7eb", background: "#fff", fontWeight: 500 }}>{change.label}</td>
                                          <td style={{ padding: "6px", border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280" }}>{change.before}</td>
                                          <td style={{ padding: "6px", border: "1px solid #e5e7eb", background: "#fff", color: "#2563eb", fontWeight: 500 }}>{change.after}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p style={{ fontSize: "11px", color: "#6b7280" }}>ยังไม่มีการเปลี่ยนแปลงข้อมูล</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: 24, textAlign: "right", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button
              onClick={handleSave}
              disabled={saveDisabled}
              style={{
                padding: "8px 24px",
                background: saveDisabled ? "#9ca3af" : "#f97316",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                cursor: saveDisabled ? "not-allowed" : "pointer",
                color: "white",
                fontWeight: 500,
                boxShadow: "0 1px 2px rgba(249, 115, 22, 0.1)",
                opacity: saveDisabled ? 0.6 : 1
              }}
              title={saveDisabled ? (isProjectLocked ? "กรุณาเลือกโครงการก่อนบันทึก" : "กรุณาแก้ไขไฟล์แนบที่ไม่ถูกต้องก่อนบันทึก") : undefined}
            >
              SAVE
            </button>
            <button onClick={handleOpenAddRevModal} disabled={isProjectLocked} style={{ padding: "8px 16px", background: isProjectLocked ? "#9ca3af" : "#4f46e5", border: "none", borderRadius: "6px", fontSize: "14px", cursor: isProjectLocked ? "not-allowed" : "pointer", color: "white", fontWeight: 500, boxShadow: "0 1px 2px rgba(79, 70, 229, 0.1)", position: "relative", display: "flex", alignItems: "center", gap: "8px", opacity: isProjectLocked ? 0.7 : 1 }} title={isProjectLocked ? "กรุณาเลือกโครงการก่อนเพิ่ม Rev." : undefined}>
              Add new Rev.
              {pendingRevCount > 0 && (<span style={{ position: "absolute", top: "-8px", right: "-8px", background: "#ef4444", color: "white", borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>{pendingRevCount}</span>)}
            </button>
            <button onClick={handleOpenImportModal} disabled={isProjectLocked} style={{ padding: "8px 16px", background: isProjectLocked ? "#9ca3af" : "#059669", border: "none", borderRadius: "6px", fontSize: "14px", cursor: isProjectLocked ? "not-allowed" : "pointer", color: "white", fontWeight: 500, boxShadow: "0 1px 2px rgba(5, 150, 105, 0.1)", opacity: isProjectLocked ? 0.7 : 1 }} title={isProjectLocked ? "กรุณาเลือกโครงการก่อนนำเข้า" : undefined}>📥 Import Excel</button>
            <button onClick={handleOpenExportModal} disabled={isProjectLocked} style={{ padding: "8px 16px", background: isProjectLocked ? "#9ca3af" : "#10b981", border: "none", borderRadius: "6px", fontSize: "14px", cursor: isProjectLocked ? "not-allowed" : "pointer", color: "white", fontWeight: 500, boxShadow: "0 1px 2px rgba(16, 185, 129, 0.1)", opacity: isProjectLocked ? 0.7 : 1 }} title={isProjectLocked ? "กรุณาเลือกโครงการก่อนส่งออก" : undefined}>📊 Export</button>
            <button onClick={handleOpenDeletedModal} disabled={isProjectLocked} style={{ padding: "8px 16px", background: isProjectLocked ? "#9ca3af" : "#6b7280", border: "none", borderRadius: "6px", fontSize: "14px", cursor: isProjectLocked ? "not-allowed" : "pointer", color: "white", fontWeight: 500, boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)", opacity: isProjectLocked ? 0.7 : 1 }} title={isProjectLocked ? "กรุณาเลือกโครงการก่อนดูรายการที่ลบ" : undefined}>🗑️ View Deleted</button>
          </div>
        </div>
      </div>
      <style>{` @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.1); } } `}</style>
      <SaveConfirmationModal isOpen={showSaveModal} data={saveModalData} onConfirm={confirmSave} onCancel={() => !isSaving && setShowSaveModal(false)} isLoading={isSaving} />
      <SuccessModal isOpen={showSuccessModal} message={successMessage} onClose={() => setShowSuccessModal(false)} />
      <AddRevisionModal isOpen={showAddRevModal} tasks={rows.filter(r => r.firestoreId).map(r => ({ id: r.id, taskName: r.relateDrawing, taskCategory: r.activity, currentStep: r.statusDwg, rev: r.lastRev }))} onSelect={handleSelectTaskForRevision} onClose={() => setShowAddRevModal(false)} />
      <DeleteConfirmModal isOpen={showDeleteModal} taskName={deleteTarget?.row.relateDrawing || ''} onConfirm={confirmDelete} onCancel={() => { setShowDeleteModal(false); setDeleteTarget(null); }} />
      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} onExport={handleExport} projects={projects} currentProjectId={selectedProject} />
      <ImportExcelModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} projectName={projects.find(p => p.id === selectedProject)?.name || 'Project'} activities={activities.map(a => a.activityName)} onImport={(tasks) => { console.log('Imported tasks:', tasks); setShowImportModal(false); }} />
      <ViewDeletedModal isOpen={showDeletedModal} onClose={() => setShowDeletedModal(false)} onRestore={handleRestoreComplete} currentProjectId={selectedProject} />
      <ManageUsersModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} />
      {historyModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40 }}>
          <div style={{ background: "#fff", width: "90%", maxWidth: "760px", maxHeight: "80vh", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#111827" }}>ประวัติการแก้ไข</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#6b7280" }}>{historyTaskName}</p>
              </div>
              <button onClick={closeHistoryModal} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#6b7280" }} title="ปิด">
                ✕
              </button>
            </div>
            <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
              {historyLoading ? (
                <p style={{ fontSize: "13px", color: "#4b5563" }}>กำลังโหลดข้อมูล...</p>
              ) : historyEntries.length === 0 ? (
                <p style={{ fontSize: "13px", color: "#4b5563" }}>ยังไม่มีประวัติการแก้ไขสำหรับงานนี้</p>
              ) : (
                historyEntries.map((entry, idx) => {
                  const timestamp = normalizeTimestamp(entry.timestamp);
                  const fileUploadedAt = normalizeTimestamp(entry.fileUploadedAt);
                  const fields = Array.isArray(entry.fields) ? (entry.fields as EditChange[]) : [];
                  return (
                    <div key={`history-entry-${idx}`} style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "14px", marginBottom: "12px", background: "#f9fafb" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#1f2937" }}>{formatDateTime(timestamp)}</div>
                        {entry.fileURL && (
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <button
                              onClick={() => {
                                setHistoryPreviewFile({
                                  name: entry.fileName || historyTaskName || 'ไฟล์แนบ',
                                  url: entry.fileURL as string,
                                });
                                setIsHistoryPreviewOpen(true);
                              }}
                              style={{ fontSize: "12px", color: "#2563eb", background: "none", border: "none", textDecoration: "underline", cursor: "pointer" }}
                            >
                              ดูไฟล์
                            </button>
                            <a
                              href={entry.fileURL as string}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: "12px", color: "#2563eb", textDecoration: "none", fontWeight: 500 }}
                            >
                              ดาวน์โหลดไฟล์
                            </a>
                          </div>
                        )}
                      </div>
                      {entry.note && (
                        <div style={{ marginBottom: "10px", fontSize: "12px", color: "#374151", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "10px" }}>
                          {entry.note}
                        </div>
                      )}
                      {fields.length > 0 ? (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                          <thead>
                            <tr>
                              <th style={{ padding: "6px", textAlign: "left", background: "#eff6ff", border: "1px solid #dbeafe" }}>ฟิลด์</th>
                              <th style={{ padding: "6px", textAlign: "left", background: "#eff6ff", border: "1px solid #dbeafe" }}>ก่อนแก้ไข</th>
                              <th style={{ padding: "6px", textAlign: "left", background: "#eff6ff", border: "1px solid #dbeafe" }}>หลังแก้ไข</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fields.map((change, changeIdx) => (
                              <tr key={`history-change-${idx}-${changeIdx}`}>
                                <td style={{ padding: "6px", border: "1px solid #e5e7eb", background: "#fff", fontWeight: 500 }}>{change.label}</td>
                                <td style={{ padding: "6px", border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280" }}>{change.before}</td>
                                <td style={{ padding: "6px", border: "1px solid #e5e7eb", background: "#fff", color: "#2563eb", fontWeight: 500 }}>{change.after}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p style={{ fontSize: "11px", color: "#6b7280" }}>ไม่มีรายละเอียดการแก้ไขฟิลด์</p>
                      )}
                      {fileUploadedAt && (
                        <p style={{ marginTop: "8px", fontSize: "11px", color: "#9ca3af" }}>
                          แนบไฟล์เมื่อ: {formatDateTime(fileUploadedAt)}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      <FilePreviewModal
        isOpen={isHistoryPreviewOpen && Boolean(historyPreviewFile)}
        onClose={() => {
          setIsHistoryPreviewOpen(false);
          setHistoryPreviewFile(null);
        }}
        file={historyPreviewFile}
      />
      <ErrorModal
        isOpen={showErrorModal}
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />
    </div>
  );
};

export default ProjectsPage;