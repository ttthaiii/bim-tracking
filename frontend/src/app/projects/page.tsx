'use client';

import React, { useEffect, useState } from "react";
import Navbar from "@/components/shared/Navbar";
import CreateProjectModal from "@/components/modals/CreateProjectModal";
import { fetchProjects, fetchRelateWorks, fetchTasks } from "@/services/firebase";
import { Project, Task } from "@/types/database";
import { Timestamp } from "firebase/firestore";

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
    id: "",  // เว้นไว้ รอสร้างใหม่ตอนกด SAVE
    relateDrawing: taskData.taskName || "",
    activity: taskData.taskCategory || "",
    startDate: formatDate(taskData.startDate || taskData.planStartDate),
    dueDate: formatDate(taskData.dueDate),
    statusDwg: taskData.currentStep || "",
    lastRev: taskData.id_Document || "",
    docNo: taskData.documentNumber || "",
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
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);

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
        
        let taskRows = tasksData.map(convertTaskToRow);
        
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
        
        setRows([...taskRows, { ...initialRows[0] }]);
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

  const handleCreateProject = (projectData: { name: string; description: string; status: string }) => {
    console.log('Creating project:', projectData);
    // Add logic to save the new project to Firebase here
    setIsCreateModalOpen(false);
  };

  const handleRowChange = (idx: number, field: keyof TaskRow, value: string | boolean) => {
    setRows(rows => rows.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  const handleRowFocus = (idx: number) => {
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

  const handleDelete = (idx: number) => {
    if (rows.length === 1) return;
    const rowToDelete = rows[idx];
    if (rowToDelete.statusDwg) {
      alert('ไม่สามารถลบแถวที่มีสถานะเอกสารได้');
      return;
    }
    setRows(prevRows => prevRows.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!selectedProject) {
      alert('กรุณาเลือกโครงการก่อน');
      return;
    }
    // Save logic remains the same
    console.log("Saving data...");
  };

  const handleEdit = (idx: number) => {
    setEditingRowIndex(idx);
  };

  const handleAdd = () => {
    setRows(rows => [...rows, { ...initialRows[0] }]);
  };

  const statuses = ["กำลังดำเนินการ", "เสร็จสิ้น", "รอดำเนินการ"];

  return (
    <div style={{ maxWidth: "100%", minHeight: "100vh", background: "#f0f2f5" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
        <Navbar />
      </div>
      
      <div style={{ padding: "40px 40px", maxWidth: "100%", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px", display: "flex", gap: "16px", alignItems: "center" }}>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            style={{ padding: "8px 16px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", color: "#374151", fontWeight: 500 }}>
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
            style={{ padding: "8px 12px", width: "200px", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "14px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", backgroundColor: "#fff", color: "#374151", cursor: "pointer" }}>
            <option value="">{loading ? "กำลังโหลด..." : "เลือกโครงการ"}</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            style={{ padding: "8px 12px", width: "150px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <option value="">สถานะ</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div style={{ background: "#fff", padding: "24px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb" }}>
          <div style={{ marginBottom: "16px", borderBottom: "1px solid #e5e7eb", paddingBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "14px", color: '#1f2937' }}>Project Name</div>
            <div style={{ color: "#666", fontSize: "14px" }}>
              {selectedProject ? projects.find(p => p.id === selectedProject)?.name : "แสดง ชื่อโครงการ"}
            </div>
          </div>

          {tasksLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>กำลังโหลดข้อมูล...</div>
          ) : (
            <div style={{ overflowX: "auto", maxHeight: "600px", border: "1px solid #e5e7eb", borderRadius: '4px' }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr style={{ background: "#ff4d00" }}>
                    <th style={{ padding: "10px 12px", fontSize: 12, textAlign: "left", color: "white", whiteSpace: "nowrap" }}>TASK ID</th>
                    <th style={{ padding: "10px 12px", fontSize: 12, textAlign: "left", color: "white", whiteSpace: "nowrap" }}>RELATE DRAWING</th>
                    <th style={{ padding: "10px 12px", fontSize: 12, textAlign: "left", color: "white", whiteSpace: "nowrap" }}>ACTIVITY</th>
                    <th style={{ padding: "10px 12px", fontSize: 12, textAlign: "left", color: "white", whiteSpace: "nowrap" }}>START DATE</th>
                    <th style={{ padding: "10px 12px", fontSize: 12, textAlign: "left", color: "white", whiteSpace: "nowrap" }}>DUE DATE</th>
                    <th style={{ padding: "10px 12px", fontSize: 12, textAlign: "left", color: "white", whiteSpace: "nowrap" }}>STATUS DWG.</th>
                    <th style={{ padding: "10px 12px", fontSize: 12, textAlign: "left", color: "white", whiteSpace: "nowrap" }}>LAST REV.</th>
                    <th style={{ padding: "10px 12px", fontSize: 12, textAlign: "left", color: "white", whiteSpace: "nowrap" }}>DOC. NO.</th>
                    <th style={{ padding: "10px 12px", fontSize: 12, textAlign: "center", color: "white", whiteSpace: "nowrap" }}>CORRECT</th>
                    <th style={{ padding: "10px 12px", width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isNewRow = !row.firestoreId;
                    const isEditing = editingRowIndex === idx;
                    const isEditable = isNewRow || isEditing;
                    
                    return (
                      <tr key={row.firestoreId || `row-${idx}`} style={{ borderBottom: "1px solid #e5e7eb", background: isEditing ? "#fef3c7" : "#fff" }}>
                        <td style={{ padding: "4px 12px", fontSize: 12, color: "#2563eb", minWidth: "150px" }}>{row.id}</td>
                        <td style={{ padding: "4px 12px", minWidth: "250px" }}>
                          <input type="text" value={row.relateDrawing} onFocus={() => handleRowFocus(idx)} onChange={e => handleRowChange(idx, "relateDrawing", e.target.value)} disabled={!isEditable} style={{ width: "100%", padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: 12, backgroundColor: "#fff", color: '#1f2937', cursor: isEditable ? "text" : "not-allowed" }} />
                        </td>
                        <td style={{ padding: "4px 12px", minWidth: "180px" }}>
                          <select value={row.activity} onFocus={() => handleRowFocus(idx)} onChange={e => handleRowChange(idx, "activity", e.target.value)} disabled={activitiesLoading || !isEditable} style={{ width: "100%", padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: 12, backgroundColor: "#fff", color: '#1f2937', cursor: isEditable ? "pointer" : "not-allowed" }}>
                            <option value="">{activitiesLoading ? "Loading..." : "Select Activity"}</option>
                            {activities.map(act => (
                              <option key={act.id} value={act.activityName}>{act.activityName}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: "4px 12px", minWidth: "130px" }}>
                          <input type="date" value={row.startDate} onFocus={() => handleRowFocus(idx)} onChange={e => handleRowChange(idx, "startDate", e.target.value)} disabled={!isEditable} style={{ width: "100%", padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: 12, backgroundColor: "#fff", color: '#1f2937', cursor: isEditable ? "text" : "not-allowed" }} />
                        </td>
                        <td style={{ padding: "4px 12px", minWidth: "130px" }}>
                          <input type="date" value={row.dueDate} onFocus={() => handleRowFocus(idx)} onChange={e => handleRowChange(idx, "dueDate", e.target.value)} disabled={!isEditable} style={{ width: "100%", padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: 12, backgroundColor: "#fff", color: '#1f2937', cursor: isEditable ? "text" : "not-allowed" }} />
                        </td>
                        <td style={{ padding: "4px 12px", fontSize: 12, color: "#1f2937" }}>{row.statusDwg ? translateStatus(row.statusDwg) : ""}</td>
                        <td style={{ padding: "4px 12px", fontSize: 12, color: "#1f2937" }}>{row.lastRev}</td>
                        <td style={{ padding: "4px 12px", fontSize: 12, color: "#1f2937" }}>{row.docNo}</td>
                        <td style={{ padding: "4px 12px", textAlign: "center" }}>
                          {isNewRow && !row.statusDwg ? (
                            <span style={{ fontSize: 12, color: "#6b7280" }}>New</span>
                          ) : isEditing ? (
                            <button onClick={() => setEditingRowIndex(null)} style={{ padding: "4px 12px", background: "#10b981", border: "none", borderRadius: "4px", fontSize: 12, cursor: "pointer", color: "white" }}>Save</button>
                          ) : (
                            <button onClick={() => handleEdit(idx)} style={{ padding: "4px 12px", background: "#f97316", border: "none", borderRadius: "4px", fontSize: 12, cursor: "pointer", color: "white" }}>Edit</button>
                          )}
                        </td>
                        <td style={{ padding: "4px 12px", textAlign: "center" }}>
                          <button onClick={() => handleDelete(idx)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }} disabled={!!row.statusDwg}>
                            <span role="img" aria-label="delete" style={{ opacity: row.statusDwg ? 0.5 : 1 }}>🗑️</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button onClick={handleSave} style={{ padding: "8px 24px", background: "#f97316", border: "none", borderRadius: "6px", fontSize: "14px", cursor: "pointer", color: "white", fontWeight: 500 }}>SAVE</button>
            <button onClick={handleAdd} style={{ padding: "8px 16px", background: "#4f46e5", border: "none", borderRadius: "6px", fontSize: "14px", cursor: "pointer", color: "white", fontWeight: 500 }}>Add new Rev.</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsPage;
