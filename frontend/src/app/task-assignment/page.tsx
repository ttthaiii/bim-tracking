'use client';

import React from "react";
import Navbar from "@/components/shared/Navbar";
import CreateProjectModal from "@/components/modals/CreateProjectModal";

interface TaskRow {
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

const mockProjects = [
  { id: "1", name: "Project Alpha" },
  { id: "2", name: "Project Beta" },
  { id: "3", name: "Project Gamma" }
];

const mockActivities = [
  "Auto",
  "Architecture", 
  "Structure",
  "MEP"
];

const initialRows: TaskRow[] = [
  {
    id: "",
    relateDrawing: "",
    activity: "Auto",
    startDate: "",
    dueDate: "",
    statusDwg: "",
    lastRev: "",
    docNo: "",
    correct: false
  }
];

const ProjectsPage = () => {
  const [selectedProject, setSelectedProject] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState("");
  const [rows, setRows] = React.useState<TaskRow[]>(initialRows);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);

  // --- แก้ไข: ปรับ function signature ให้ตรงกับ onSubmit ---
  const handleCreateProject = (projectData: { name: string; code: string; leader: string }) => {
    // TODO: Implement project creation logic
    console.log('Creating project:', projectData);
    setIsCreateModalOpen(false);
  };

  const [touchedRows, setTouchedRows] = React.useState<Set<number>>(new Set());

  const handleRowChange = (idx: number, field: keyof TaskRow, value: string | boolean) => {
    setRows(rows => {
      const updatedRows = rows.map((row, i) =>
        i === idx ? { ...row, [field]: value } : row
      );
      
      if (!touchedRows.has(idx)) {
        setTouchedRows(prev => {
          const newSet = new Set(prev);
          newSet.add(idx);
          return newSet;
        });
        
        const hasEmptyRowAfter = updatedRows[idx + 1];
        if (!hasEmptyRowAfter) {
          return [...updatedRows, {
            id: "",
            relateDrawing: "",
            activity: mockActivities[0],
            startDate: "",
            dueDate: "",
            statusDwg: "",
            lastRev: "",
            docNo: "",
            correct: false
          }];
        }
      }
      
      return updatedRows;
    });
  };

  const handleDelete = (idx: number) => {
    setRows(prevRows => {
      const newRows = prevRows.filter((_, i) => i !== idx);
      setTouchedRows(prev => {
        const newTouched = new Set<number>();
        prev.forEach(touchedIdx => {
          if (touchedIdx < idx) {
            newTouched.add(touchedIdx);
          } else if (touchedIdx > idx) {
            newTouched.add(touchedIdx - 1);
          }
        });
        return newTouched;
      });
      return newRows;
    });
  };

  const handleAdd = () => {
    const newRow: TaskRow = {
      id: "",
      relateDrawing: "",
      activity: mockActivities[0],
      startDate: "",
      dueDate: "",
      statusDwg: "",
      lastRev: "",
      docNo: "",
      correct: false
    };
    setRows(rows => [...rows, newRow]);
  };

  const statuses = ["กำลังดำเนินการ", "เสร็จสิ้น", "รอดำเนินการ"];

  return (
    <div style={{ maxWidth: "100%", minHeight: "100vh", background: "#f0f2f5" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
        <Navbar />
      </div>
      
      <div style={{ padding: "40px 40px", maxWidth: "1400px", margin: "0 auto" }}>
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
              fontWeight: 500,
              transition: "all 0.2s"
            }}
          >
            <span style={{ color: "#6366f1", fontWeight: "bold" }}>+</span> สร้างโครงการใหม่
          </button>
          
          {/* --- แก้ไข: เปลี่ยน onCreate เป็น onSubmit และเพิ่ม props ที่ขาดไป --- */}
          {isCreateModalOpen && <CreateProjectModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreateProject}
            onViewProjects={() => console.log("View projects clicked from task assignment")}
          />}
          
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            style={{ 
              padding: "8px 12px",
              width: "200px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "14px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              backgroundColor: "#fff",
              color: "#374151"
            }}
          >
            <option value="">เลือกโครงการ</option>
            {mockProjects.map(p => (
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
              <div style={{ color: "#666", fontSize: "14px" }}>แสดง ชื่อโครงการ</div>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e5e7eb" }}>
              <thead>
                <tr style={{ background: "#ff4d00", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                  <th style={{ padding: "12px 16px", fontSize: 14, textAlign: "left", color: "white" }}>TASK ID</th>
                  <th style={{ padding: "12px 16px", fontSize: 14, textAlign: "left", color: "white" }}>RELATE DRAWING</th>
                  <th style={{ padding: "12px 16px", fontSize: 14, textAlign: "left", color: "white" }}>ACTIVITY</th>
                  <th style={{ padding: "12px 16px", fontSize: 14, textAlign: "left", color: "white" }}>START DATE</th>
                  <th style={{ padding: "12px 16px", fontSize: 14, textAlign: "left", color: "white" }}>DUE DATE</th>
                  <th style={{ padding: "12px 16px", fontSize: 14, textAlign: "left", color: "white" }}>STATUS DWG.</th>
                  <th style={{ padding: "12px 16px", fontSize: 14, textAlign: "left", color: "white" }}>LAST REV.</th>
                  <th style={{ padding: "12px 16px", fontSize: 14, textAlign: "left", color: "white" }}>DOC. NO.</th>
                  <th style={{ padding: "12px 16px", fontSize: 14, textAlign: "center", color: "white" }}>CORRECT</th>
                  <th style={{ padding: "12px 16px", width: 40, color: "white" }}></th>
                </tr>
              </thead>
              <tbody>
                {[...rows].map((row, idx) => (
                  <tr key={row.id || `row-${idx}`} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px 16px", fontSize: 14, color: "#2563eb" }}>{row.id}</td>
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>
                      <input
                        type="text"
                        value={row.relateDrawing}
                        onChange={e => handleRowChange(idx, "relateDrawing", e.target.value)}
                        style={{ 
                          width: "100%", 
                          padding: "6px 8px", 
                          border: "1px solid #e5e7eb",
                          borderRadius: "4px",
                          fontSize: 14
                        }}
                      />
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>
                      <select 
                        value={row.activity}
                        onChange={e => handleRowChange(idx, "activity", e.target.value)}
                        style={{ 
                          width: "100%", 
                          padding: "6px 8px", 
                          border: "1px solid #e5e7eb",
                          borderRadius: "4px",
                          fontSize: 14
                        }}
                      >
                        {mockActivities.map(act => (
                          <option key={act} value={act}>{act}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>
                      <input
                        type="date"
                        value={row.startDate}
                        onChange={e => handleRowChange(idx, "startDate", e.target.value)}
                        style={{ 
                          width: "100%", 
                          padding: "6px 8px", 
                          border: "1px solid #e5e7eb",
                          borderRadius: "4px",
                          fontSize: 14
                        }}
                      />
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>
                      <input
                        type="date"
                        value={row.dueDate}
                        onChange={e => handleRowChange(idx, "dueDate", e.target.value)}
                        style={{ 
                          width: "100%", 
                          padding: "6px 8px", 
                          border: "1px solid #e5e7eb",
                          borderRadius: "4px",
                          fontSize: 14
                        }}
                      />
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14, color: "#2563eb" }}>{row.statusDwg}</td>
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>{row.lastRev}</td>
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>{row.docNo}</td>
                    <td style={{ padding: "12px 16px", fontSize: 14, textAlign: "center" }}>
                      <button style={{
                        padding: "4px 12px",
                        background: "#f97316",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: 14,
                        cursor: "pointer",
                        color: "white",
                        boxShadow: "0 2px 4px rgba(249, 115, 22, 0.2), 0 1px 2px rgba(249, 115, 22, 0.1)"
                      }}>
                        Edit
                      </button>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14, textAlign: "center" }}>
                      <button
                        onClick={() => handleDelete(idx)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px"
                        }}
                      >
                        <span role="img" aria-label="delete">🗑️</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 24, textAlign: "right", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button
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