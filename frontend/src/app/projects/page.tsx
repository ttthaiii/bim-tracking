"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/shared/Navbar";
import CreateProjectModal from "@/components/modals/CreateProjectModal";
import { fetchProjects, fetchRelateWorks, fetchTasks } from "@/services/firebase";
import { Project, Task } from "@/types/database";
import { Timestamp } from "firebase/firestore";
import SaveConfirmationModal from "@/components/modals/SaveConfirmationModal";
import { updateTask, createTask } from "@/services/firebase";
import SuccessModal from "@/components/modals/SuccessModal";
import AddRevisionModal from "@/components/modals/AddRevisionModal";

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
      const day = String(timestamp.getDate()).padStart(2, '0');
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
    id: "",
    relateDrawing: taskData.taskName || "",
    activity: taskData.taskCategory || "",
    startDate: formatDate(taskData.planStartDate),
    dueDate: formatDate(taskData.dueDate),
    statusDwg: taskData.currentStep || "",
    lastRev: taskData.rev || "00",
    docNo: taskData.documentNumber || "",
    correct: false
  };
};

// ฟังก์ชันสร้าง TASK ID: TTS-BIM-{abbr}-XXX-{runningNo}
const generateTaskId = (
  projectAbbr: string,
  activityName: string,
  existingRows: TaskRow[],
  activities: any[],
  currentCounter: number
): string => {
  // หา Activity Order
  let activityOrder = "XXX"; // default
  
  if (activityName && activityName !== "เลือก Activity") {
    const activityIndex = activities.findIndex(a => a.activityName === activityName);
    if (activityIndex >= 0) {
      activityOrder = String(activityIndex + 1).padStart(3, '0');
    }
  }
  
  const runningNo = String(currentCounter).padStart(3, '0');
  return `TTS-BIM-${projectAbbr}-${activityOrder}-${runningNo}`;
};

// ฟังก์ชันแปล Status เป็นภาษาไทย
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
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [rows, setRows] = useState<TaskRow[]>(initialRows);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
  const loadTasks = async () => {
    if (!selectedProject) {
      setRows(initialRows);
      setTouchedRows(new Set());
      return;
    }

    try {
      setTasksLoading(true);
      const tasksData = await fetchTasks(selectedProject);
      
      if (tasksData.length > 0) {
        const currentProject = projects.find(p => p.id === selectedProject);
        
        // แปลง Tasks → TaskRow
        let taskRows = tasksData.map(convertTaskToRow);
        
        // สร้าง TASK ID ให้ข้อมูลเก่าที่ยังไม่มี
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
        
        setRows([...taskRows, {
          id: "",
          relateDrawing: "",
          activity: "",
          startDate: "",
          dueDate: "",
          statusDwg: "",
          lastRev: "",
          docNo: "",
          correct: false
        }]);
        setTouchedRows(new Set());
      } else {
        setRows(initialRows);
        setTouchedRows(new Set());
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setRows(initialRows);
    } finally {
      setTasksLoading(false);
    }
  };
  loadTasks();
}, [selectedProject, projects]);

  const handleCreateProject = (projectData: { name: string; code: string; leader: string }) => {
    console.log('Creating project:', projectData);
    setIsCreateModalOpen(false);
  };

const handleRowChange = (idx: number, field: keyof TaskRow, value: string | boolean) => {
  setRows(rows => rows.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  // บันทึกว่าแถวนี้ถูกแก้ไข
  if (rows[idx]?.firestoreId) {
    setEditedRows(prev => new Set(prev).add(idx));
  }
};

  const handleRowFocus = (idx: number) => {
    if (!touchedRows.has(idx)) {
      setTouchedRows(prev => new Set(prev).add(idx));
      setRows(rows => {
        if (!rows[idx + 1]) {
          return [...rows, {
            id: "",
            relateDrawing: "",
            activity: "",
            startDate: "",
            dueDate: "",
            statusDwg: "",
            lastRev: "",
            docNo: "",
            correct: false
          }];
        }
        return rows;
      });
    }
  };

const handleDelete = (idx: number) => {
  if (rows.length === 1) return;
  
  const rowToDelete = rows[idx];
  
  // ป้องกันลบ: ถ้ามี STATUS DWG.
  if (rowToDelete.statusDwg) {
    alert('ไม่สามารถลบแถวที่มีสถานะเอกสารได้');
    return;
  }
  
  const isEmptyRow = !rowToDelete.id && !rowToDelete.relateDrawing && !rowToDelete.activity && !rowToDelete.startDate && !rowToDelete.dueDate;
  if (isEmptyRow && idx === rows.length - 1) return;

    setRows(prevRows => prevRows.filter((_, i) => i !== idx));
    setTouchedRows(prev => {
      const newTouched = new Set<number>();
      prev.forEach(touchedIdx => {
        if (touchedIdx < idx) newTouched.add(touchedIdx);
        else if (touchedIdx > idx) newTouched.add(touchedIdx - 1);
      });
      return newTouched;
    });
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

 // แยกแถวที่ต้อง UPDATE และ CREATE
const rowsToUpdate: TaskRow[] = [];
const rowsToCreate: TaskRow[] = [];

rows.forEach((row, idx) => {
  // ข้ามแถวว่าง
  if (!row.relateDrawing || !row.activity || !row.startDate || !row.dueDate) {
    return;
  }

  // UPDATE: แถวที่มี firestoreId และถูกแก้ไข
  if (row.firestoreId && editedRows.has(idx)) {
    rowsToUpdate.push(row);
  } 
  // CREATE: แถวที่ไม่มี firestoreId (ไม่ว่าจะมี id หรือไม่ก็ตาม)
  else if (!row.firestoreId) {
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


// เตรียมข้อมูลสำหรับ Modal พร้อมรายละเอียดที่เปลี่ยนแปลง
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

    // ==================== UPDATE ====================
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

    // ==================== CREATE ====================
    let finalRows = [...rows];
    const rowsToCreate = rows.filter(r => !r.firestoreId && !r.id && r.relateDrawing && r.activity);

if (rowsToCreate.length > 0) {
  // หา Running No. สูงสุด
  const maxRunning = rows.reduce((max, row) => {
    if (!row.id || !row.id.startsWith('TTS-BIM-')) return max;
    const parts = row.id.split('-');
    if (parts.length >= 5) {
      return Math.max(max, parseInt(parts[4]) || 0);
    }
    return max;
  }, 0);

  let counter = maxRunning + 1;

  // สร้าง Task ID และบันทึกลง Firestore
  const createPromises = rowsToCreate.map(async (row) => {
    // ถ้ายังไม่มี TASK ID ให้สร้างให้
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

  // อัพเดท state
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

const handleSelectTaskForRevision = (task: any) => {
  // หา rev. ล่าสุด
  const relatedTasks = rows.filter(r => 
    r.relateDrawing.startsWith(task.taskName.replace(/\sREV\.\d+$/, ''))
  );
  
  const maxRev = relatedTasks.reduce((max, r) => {
    const revMatch = r.lastRev?.match(/\d+/);
    return revMatch ? Math.max(max, parseInt(revMatch[0])) : max;
  }, 0);
  
  const nextRev = String(maxRev + 1).padStart(2, '0');
  
  // สร้างแถวใหม่
  const newRow = {
    id: "",
    relateDrawing: `${task.taskName} REV.${nextRev}`,
    activity: task.taskCategory,
    startDate: "",
    dueDate: "",
    statusDwg: "",
    lastRev: nextRev,
    docNo: "",
    correct: false
  };
  
  setRows([...rows.filter(r => r.relateDrawing || r.activity), newRow, initialRows[0]]);
};

const handleAdd = () => {
    setRows(rows => [...rows, {
      id: "",
      relateDrawing: "",
      activity: "",
      startDate: "",
      dueDate: "",
      statusDwg: "",
      lastRev: "",
      docNo: "",
      correct: false
    }]);
  };

  const statuses = ["กำลังดำเนินการ", "เสร็จสิ้น", "รอดำเนินการ"];

  return (
    <div style={{ maxWidth: "100%", minHeight: "100vh", background: "#f0f2f5" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
        <Navbar />
      </div>
      
      <div style={{ padding: "40px 40px", maxWidth: "100%", margin: "0 auto" }}>
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
            <option value="">{loading ? "กำลังโหลด..." : "เลือกโครงการ"}</option>
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
                {selectedProject 
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
          <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "140px" }}>ACTIVITY</th>
          <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "120px" }}>PLAN START DATE</th>
          <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "110px" }}>DUE DATE</th>
          <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "140px" }}>STATUS DWG.</th>
          <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "center", color: "white", whiteSpace: "nowrap", minWidth: "70px" }}>LINK FILE</th>
          <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "120px" }}>DOC. NO.</th>
          <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "80px" }}>LAST REV.</th>
          <th style={{ padding: "6px 8px", fontSize: 11, textAlign: "center", color: "white", whiteSpace: "nowrap", minWidth: "90px" }}>CORRECT</th>
          <th style={{ padding: "8px 12px", width: 40, color: "white" }}></th>
        </tr>
      </thead>
      <tbody>
{rows.map((row, idx) => {
  const isNewRow = !row.id; // แถวใหม่ที่ยังไม่มี TASK ID
  const isEditing = editingRows.has(idx); // แถวที่กำลังแก้ไข
  const isEditable = isNewRow || isEditing; // แก้ไขได้หรือไม่
  
  return (
    <tr 
      key={row.firestoreId || `row-${idx}`} 
      style={{ 
        borderBottom: "1px solid #e5e7eb", 
        background: isEditing ? "#fff7ed" : "#fff" // ไฮไลท์แถวที่กำลังแก้
      }}
    >
      <td style={{ padding: "4px 6px", fontSize: 10, color: "#2563eb", minWidth: "150px" }}>{row.id}</td>
      <td style={{ padding: "4px 6px", fontSize: 10, minWidth: "250px" }}>
        <input
          type="text"
          value={row.relateDrawing}
          onFocus={() => handleRowFocus(idx)}
          onChange={e => handleRowChange(idx, "relateDrawing", e.target.value)}
          disabled={!isEditable}
          style={{ 
            width: "100%", 
            padding: "4px 6px", 
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            fontSize: 10,
            backgroundColor: !isEditable ? "#f9fafb" : "#fff",
            cursor: !isEditable ? "not-allowed" : "text"
          }}
        />
      </td>
      <td style={{ padding: "6px 10px", fontSize: 10 }}>
        <select 
          value={row.activity}
          onFocus={() => handleRowFocus(idx)}
          onChange={e => handleRowChange(idx, "activity", e.target.value)}
          disabled={activitiesLoading || !isEditable}
          style={{ 
            width: "100%", 
            padding: "4px 6px", 
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            fontSize: 10,
            backgroundColor: !isEditable ? "#f9fafb" : activitiesLoading ? "#f3f4f6" : "#fff",
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
          onFocus={() => handleRowFocus(idx)}
          onChange={e => handleRowChange(idx, "startDate", e.target.value)}
          disabled={!isEditable}
          style={{ 
            width: "100%", 
            padding: "4px 6px", 
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            fontSize: 10,
            backgroundColor: !isEditable ? "#f9fafb" : "#fff",
            cursor: !isEditable ? "not-allowed" : "text"
          }}
        />
      </td>
      <td style={{ padding: "6px 10px", fontSize: 10 }}>
        <input
          type="date"
          value={row.dueDate}
          onFocus={() => handleRowFocus(idx)}
          onChange={e => handleRowChange(idx, "dueDate", e.target.value)}
          disabled={!isEditable}
          style={{ 
            width: "100%", 
            padding: "4px 6px", 
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            fontSize: 10,
            backgroundColor: !isEditable ? "#f9fafb" : "#fff",
            cursor: !isEditable ? "not-allowed" : "text"
          }}
        />
      </td>
      <td style={{ padding: "4px 6px", fontSize: 10, color: "#2563eb" }}>
        {row.statusDwg ? translateStatus(row.statusDwg) : ""}
      </td>
      <td style={{ padding: "4px 6px", fontSize: 10, textAlign: "center" }}>
        {row.docNo ? (
          <a 
            href="#" 
            style={{ color: "#3b82f6", textDecoration: "none" }}
            onClick={(e) => {
              e.preventDefault();
              alert('Link file feature coming soon');
            }}
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
      <td style={{ padding: "4px 6px", fontSize: 10, textAlign: "center" }}>
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
              padding: "3px 10px",
              background: "#f97316",
              border: "none",
              borderRadius: "3px",
              fontSize: 10,
              cursor: "pointer",
              color: "white",
              boxShadow: "0 2px 4px rgba(249, 115, 22, 0.2)"
            }}
          >
            Edit
          </button>
        )}
      </td>
      <td style={{ padding: "4px 6px", fontSize: 10, textAlign: "center" }}>
        <button
          onClick={() => handleDelete(idx)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}
        >
          <span role="img" aria-label="delete">🗑️</span>
        </button>
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
                boxShadow: "0 1px 2px rgba(79, 70, 229, 0.1)"
              }}
            >
              Add new Rev.
            </button>
          </div>
        </div>
      </div>

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
    </div>
  );
};

export default ProjectsPage;