'use client';

import React, { useEffect, useState } from "react";
import CreateProjectModal from "@/components/modals/CreateProjectModal";
import { fetchProjects, fetchRelateWorks, fetchTasks } from "@/services/firebase";
import { Project, Task } from "@/types/database";
import { Timestamp } from "firebase/firestore";
import PageLayout from "@/components/shared/PageLayout"; 

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
  rev?: string; 
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
  
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  try {
    let date: Date;

    if (timestamp instanceof Timestamp) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
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
          // Adjust year for B.E. to C.E. conversion if it's a Thai year
          const finalYear = yearNum > 2500 ? yearNum - 543 : yearNum; 
          date = new Date(finalYear, parseInt(month) - 1, dayNum);
        } else {
          date = new Date(timestamp);
        }
      } else {
        date = new Date(timestamp);
      }
    } else if (typeof timestamp === 'object' && timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      return "";
    }
    
    if (isNaN(date.getTime())) {
      return "";
    }

    const day = String(date.getDate()).padStart(2, '0');
    const monthAbbr = monthNames[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2); // Get last 2 digits of year
    
    return `${day}-${monthAbbr}-${year}`;
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
    lastRev: taskData.lastRev || "", 
    docNo: taskData.documentNumber || "",
    correct: false,
    rev: taskData.rev || "", 
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
    <PageLayout> 
      <div className="py-8"> 
        <div className="mb-6 flex items-center gap-4"> 
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" >
            <span className="font-bold text-blue-600">+</span> สร้างโครงการใหม่
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
            className="w-52 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500" >
            <option value="">{loading ? "กำลังโหลด..." : "เลือกโครงการ"}</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="w-36 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500" >
            <option value="">สถานะ</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md"> 
          <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
            <div className="text-sm text-gray-800">Project Name</div>
            <div className="text-sm text-gray-600">
              {selectedProject ? projects.find(p => p.id === selectedProject)?.name : "แสดง ชื่อโครงการ"}
            </div>
          </div>

          {tasksLoading ? (
            <div className="py-10 text-center text-gray-600">กำลังโหลดข้อมูล...</div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-gray-200" style={{ maxHeight: "600px" }}>
              <table className="w-full table-auto border-collapse"> 
                <thead className="bg-red-600 sticky top-0 z-10"><tr><th className="px-3 py-2 text-left text-xs font-semibold uppercase text-white whitespace-nowrap">TASK ID</th><th className="px-3 py-2 text-left text-xs font-semibold uppercase text-white whitespace-nowrap">RELATE DRAWING</th><th className="px-3 py-2 text-left text-xs font-semibold uppercase text-white whitespace-nowrap">ACTIVITY</th><th className="px-3 py-2 text-left text-xs font-semibold uppercase text-white whitespace-nowrap">START DATE</th><th className="px-3 py-2 text-left text-xs font-semibold uppercase text-white whitespace-nowrap">DUE DATE</th><th className="px-3 py-2 text-left text-xs font-semibold uppercase text-white whitespace-nowrap">REV</th><th className="px-3 py-2 text-left text-xs font-semibold uppercase text-white whitespace-nowrap">STATUS DWG.</th><th className="px-3 py-2 text-left text-xs font-semibold uppercase text-white whitespace-nowrap">LAST REV.</th><th className="px-3 py-2 text-left text-xs font-semibold uppercase text-white whitespace-nowrap">DOC. NO.</th><th className="px-3 py-2 text-center text-xs font-semibold uppercase text-white whitespace-nowrap">CORRECT</th><th className="px-3 py-2 w-10"></th></tr></thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isNewRow = !row.firestoreId;
                    const isEditing = editingRowIndex === idx;
                    const isEditable = isNewRow || isEditing;
                    
                    return (
                      <tr key={row.firestoreId || `row-${idx}`} className={`border-b border-gray-200 ${isEditing ? "bg-yellow-50" : "bg-white"}`}> 
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-blue-600 min-w-[150px]">{row.id}</td>
                        <td className="px-3 py-2 min-w-[250px]">
                          <input type="text" value={row.relateDrawing} onFocus={() => handleRowFocus(idx)} onChange={e => handleRowChange(idx, "relateDrawing", e.target.value)} disabled={!isEditable} className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50" />
                        </td>
                        <td className="px-3 py-2 min-w-[180px]">
                          <select value={row.activity} onFocus={() => handleRowFocus(idx)} onChange={e => handleRowChange(idx, "activity", e.target.value)} disabled={activitiesLoading || !isEditable} className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50">
                            <option value="">{activitiesLoading ? "Loading..." : "Select Activity"}</option>
                            {activities.map(act => (
                              <option key={act.id} value={act.activityName}>{act.activityName}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 min-w-[130px]">
                          <input type="date" value={row.startDate} onFocus={() => handleRowFocus(idx)} onChange={e => handleRowChange(idx, "startDate", e.target.value)} disabled={!isEditable} className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50" />
                        </td>
                        <td className="px-3 py-2 min-w-[130px]">
                          <input type="date" value={row.dueDate} onFocus={() => handleRowFocus(idx)} onChange={e => handleRowChange(idx, "dueDate", e.target.value)} disabled={!isEditable} className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50" />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-800 min-w-[80px]">{row.rev}</td> 
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-800">{row.statusDwg ? translateStatus(row.statusDwg) : ""}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-800">{row.lastRev}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-800">{row.docNo}</td>
                        <td className="px-3 py-2 text-center">
                          {isNewRow && !row.statusDwg ? (
                            <span className="text-xs text-gray-500">New</span>
                          ) : isEditing ? (
                            <button onClick={() => setEditingRowIndex(null)} className="rounded-md bg-green-500 px-3 py-1 text-xs text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">Save</button>
                          ) : (
                            <button onClick={() => handleEdit(idx)} className="rounded-md bg-orange-500 px-3 py-1 text-xs text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2">Edit</button>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => handleDelete(idx)} className="p-1 text-gray-600 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!!row.statusDwg}>
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

          <div className="mt-6 flex justify-end gap-3"> 
            <button onClick={handleSave} className="rounded-md bg-orange-500 px-6 py-2 text-sm font-medium text-white shadow hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2">SAVE</button>
            <button onClick={handleAdd} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Add new Rev.</button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default ProjectsPage;
