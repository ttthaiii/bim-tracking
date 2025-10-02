"use client";

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
    id: "",
    relateDrawing: taskData.taskName || "",
    activity: taskData.taskCategory || "",
    startDate: formatDate(taskData.startDate || taskData.planStartDate),
    dueDate: formatDate(taskData.dueDate),
    statusDwg: taskData.currentStep || "",
    lastRev: taskData.rev || "",
    docNo: taskData.documentNumber || "",
    correct: false
  };
};

// ฟังก์ชันสร้าง TASK ID: TTS-BIM-{abbr}-XXX-{runningNo}
const generateTaskId = (
  projectAbbr: string,
  existingRows: TaskRow[]
): string => {
  // หา Running No. สูงสุดจาก Tasks ที่มี TASK ID แล้ว
  const maxRunning = existingRows.reduce((max, row) => {
    if (!row.id || !row.id.startsWith('TTS-BIM-')) return max;
    const parts = row.id.split('-');
    if (parts.length >= 5) {
      const running = parseInt(parts[4]) || 0;
      return Math.max(max, running);
    }
    return max;
  }, 0);
  
  const runningNo = String(maxRunning + 1).padStart(3, '0');
  
  // สร้าง TASK ID โดยเว้น Activity (XXX)
  return `TTS-BIM-${projectAbbr}-XXX-${runningNo}`;
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
          const taskRows = tasksData.map(convertTaskToRow);
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
  }, [selectedProject]);

  const handleCreateProject = (projectData: { name: string; code: string; leader: string }) => {
    console.log('Creating project:', projectData);
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

const handleSave = () => {
  if (!selectedProject) {
    alert('กรุณาเลือกโครงการก่อน');
    return;
  }

  const currentProject = projects.find(p => p.id === selectedProject);
  if (!currentProject || !currentProject.abbr) {
    alert('ไม่พบข้อมูลโครงการ');
    return;
  }

  // กรอง: เฉพาะแถวที่มีข้อมูล และยังไม่มี TASK ID
  const newRows = rows.filter(row => 
    row.relateDrawing && 
    row.activity && 
    row.startDate && 
    row.dueDate && 
    !row.id
  );

  if (newRows.length === 0) {
    alert('ไม่มีข้อมูลใหม่ที่ต้องบันทึก');
    return;
  }

  // สร้าง TASK ID ให้แถวใหม่
  const updatedRows = rows.map(row => {
    // ถ้ามี ID อยู่แล้ว หรือไม่มีข้อมูลครบ → ไม่แก้ไข
    if (row.id || !row.relateDrawing || !row.activity || !row.startDate || !row.dueDate) {
      return row;
    }
    
    // สร้าง TASK ID ใหม่
    return {
      ...row,
      id: generateTaskId(currentProject.abbr, rows)
    };
  });

  setRows(updatedRows);

  // แสดง popup ยืนยัน
  const confirmSave = window.confirm(
    `คุณต้องการบันทึก ${newRows.length} รายการใช่หรือไม่?`
  );

  if (confirmSave) {
    // TODO: บันทึกลง Firestore
    console.log('Saving to Firestore:', updatedRows.filter(r => r.id));
    alert('บันทึกสำเร็จ');
  }
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
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e5e7eb" }}>
                <thead>
                  <tr style={{ background: "#ff4d00", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                    <th style={{ padding: "8px 12px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "150px" }}>TASK ID</th>
                    <th style={{ padding: "8px 12px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "250px" }}>RELATE DRAWING</th>
                    <th style={{ padding: "8px 12px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "180px" }}>ACTIVITY</th>
                    <th style={{ padding: "8px 12px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "130px" }}>START DATE</th>
                    <th style={{ padding: "8px 12px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "130px" }}>DUE DATE</th>
                    <th style={{ padding: "8px 12px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "180px" }}>STATUS DWG.</th>
                    <th style={{ padding: "8px 12px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "100px" }}>LAST REV.</th>
                    <th style={{ padding: "8px 12px", fontSize: 11, textAlign: "left", color: "white", whiteSpace: "nowrap", minWidth: "120px" }}>DOC. NO.</th>
                    <th style={{ padding: "8px 12px", fontSize: 11, textAlign: "center", color: "white", whiteSpace: "nowrap", minWidth: "80px" }}>CORRECT</th>
                    <th style={{ padding: "8px 12px", width: 40, color: "white" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.firestoreId || `row-${idx}`} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "6px 10px", fontSize: 10, color: "#2563eb", minWidth: "150px" }}>{row.id}</td>
                      <td style={{ padding: "6px 10px", fontSize: 10, minWidth: "250px" }}>
                        <input
                          type="text"
                          value={row.relateDrawing}
                          onFocus={() => handleRowFocus(idx)}
                          onChange={e => handleRowChange(idx, "relateDrawing", e.target.value)}
                          style={{ 
                            width: "100%", 
                            padding: "4px 6px", 
                            border: "1px solid #e5e7eb",
                            borderRadius: "4px",
                            fontSize: 10
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px 10px", fontSize: 10 }}>
                        <select 
                          value={row.activity}
                          onFocus={() => handleRowFocus(idx)}
                          onChange={e => handleRowChange(idx, "activity", e.target.value)}
                          disabled={activitiesLoading}
                          style={{ 
                            width: "100%", 
                            padding: "4px 6px", 
                            border: "1px solid #e5e7eb",
                            borderRadius: "4px",
                            fontSize: 10,
                            backgroundColor: activitiesLoading ? "#f3f4f6" : "#fff",
                            cursor: activitiesLoading ? "not-allowed" : "pointer"
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
                          style={{ 
                            width: "100%", 
                            padding: "4px 6px", 
                            border: "1px solid #e5e7eb",
                            borderRadius: "4px",
                            fontSize: 10
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px 10px", fontSize: 10 }}>
                        <input
                          type="date"
                          value={row.dueDate}
                          onFocus={() => handleRowFocus(idx)}
                          onChange={e => handleRowChange(idx, "dueDate", e.target.value)}
                          style={{ 
                            width: "100%", 
                            padding: "4px 6px", 
                            border: "1px solid #e5e7eb",
                            borderRadius: "4px",
                            fontSize: 10
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px 10px", fontSize: 10, color: "#2563eb" }}>{row.statusDwg}</td>
                      <td style={{ padding: "6px 10px", fontSize: 10 }}>{row.lastRev}</td>
                      <td style={{ padding: "6px 10px", fontSize: 10 }}>{row.docNo}</td>
                      <td style={{ padding: "6px 10px", fontSize: 10, textAlign: "center" }}>
                        <button style={{
                          padding: "3px 10px",
                          background: "#f97316",
                          border: "none",
                          borderRadius: "3px",
                          fontSize: 10,
                          cursor: "pointer",
                          color: "white",
                          boxShadow: "0 2px 4px rgba(249, 115, 22, 0.2)"
                        }}>
                          Edit
                        </button>
                      </td>
                      <td style={{ padding: "6px 10px", fontSize: 10, textAlign: "center" }}>
                        <button
                          onClick={() => handleDelete(idx)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}
                        >
                          <span role="img" aria-label="delete">🗑️</span>
                        </button>
                      </td>
                    </tr>
                  ))}
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
              onClick={handleAdd}
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
    </div>
  );
};

export default ProjectsPage;