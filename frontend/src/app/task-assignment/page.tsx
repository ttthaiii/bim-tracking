"use client";
import React, { useState } from 'react';
import Navbar from '@/components/shared/Navbar';

interface TaskRow {
  id: string;
  relateDrawing: string;
  activity: string;
  relateWork: string;
  internalRev: string;
  workScale: string;
  assignee: string;
  deadline: string;
  progress: number;
}

const mockProjects = [
  { id: '1', name: 'Project Alpha' },
  { id: '2', name: 'Project Beta' },
  { id: '3', name: 'Project Gamma' },
];

const mockActivities = [
  'Auto',
  'Architecture',
  'Structure',
  'MEP'
];

const initialRows: TaskRow[] = [
  { 
    id: 'TSK-001', 
    relateDrawing: 'Drawing-A', 
    activity: 'Auto', 
    relateWork: 'Framing Plans', 
    internalRev: '1', 
    workScale: 'S', 
    assignee: 'Wanchai', 
    deadline: '3 Days',
    progress: 60 
  }
];

export default function TaskAssignmentPage() {
  const [selectedProject, setSelectedProject] = useState('');
  const [rows, setRows] = useState<TaskRow[]>(initialRows);

  const handleRowChange = (idx: number, field: keyof TaskRow, value: string) => {
    setRows(rows => rows.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  const handleDelete = (idx: number) => {
    setRows(rows => rows.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ maxWidth: '100%', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', position: 'sticky', top: 0, zIndex: 10 }}>
        <Navbar />
      </div>
      
      <div style={{ padding: '40px 40px', maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '32px' }}>Task Assignment</h1>
        
        <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>Project Name</label>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              style={{ 
                padding: '8px 12px',
                width: '100%',
                maxWidth: '400px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">Hot Work</option>
              {mockProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FF4D1C', color: 'white' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 500, fontSize: 14, textAlign: 'left' }}>SUBTASK ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500, fontSize: 14, textAlign: 'left' }}>RELATE DRAWING</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500, fontSize: 14, textAlign: 'left' }}>ACTIVITY</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500, fontSize: 14, textAlign: 'left' }}>RELATE WORK</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500, fontSize: 14, textAlign: 'left' }}>INTERNAL REV.</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500, fontSize: 14, textAlign: 'left' }}>WORK SCALE</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500, fontSize: 14, textAlign: 'left' }}>ASSIGNEE</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500, fontSize: 14, textAlign: 'left' }}>DEADLINE</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500, fontSize: 14, textAlign: 'left' }}>PROGRESS</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500, fontSize: 14, textAlign: 'center' }}>LINK FILE</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500, fontSize: 14, textAlign: 'center' }}>CORRECT</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '16px', fontSize: 14 }}>{row.id}</td>
                    <td style={{ padding: '16px', fontSize: 14 }}>{row.relateDrawing}</td>
                    <td style={{ padding: '16px', fontSize: 14 }}>
                      <select 
                        value={row.activity} 
                        onChange={e => handleRowChange(idx, 'activity', e.target.value)}
                        style={{ width: '100%', padding: '8px', fontSize: 14, border: '1px solid #ddd', borderRadius: 4 }}
                      >
                        {mockActivities.map(act => (
                          <option key={act} value={act}>{act}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '16px', fontSize: 14 }}>{row.relateWork}</td>
                    <td style={{ padding: '16px', fontSize: 14, textAlign: 'center' }}>{row.internalRev}</td>
                    <td style={{ padding: '16px', fontSize: 14, textAlign: 'center' }}>{row.workScale}</td>
                    <td style={{ padding: '16px', fontSize: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ 
                          width: 24, 
                          height: 24, 
                          borderRadius: '50%', 
                          background: '#1a73e8', 
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12
                        }}>W</div>
                        <span>{row.assignee}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontSize: 14 }}>{row.deadline}</td>
                    <td style={{ padding: '16px', fontSize: 14 }}>
                      <div style={{ width: '100%', height: 6, background: '#eee', borderRadius: 3 }}>
                        <div style={{ width: `${row.progress}%`, height: '100%', background: '#1a73e8', borderRadius: 3 }}></div>
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontSize: 14, textAlign: 'center' }}>
                      <button style={{ 
                        padding: '4px 12px', 
                        background: '#fff', 
                        border: '1px solid #ddd', 
                        borderRadius: 4, 
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        LINK
                        <span style={{ fontSize: 16 }}>✏️</span>
                      </button>
                    </td>
                    <td style={{ padding: '16px', fontSize: 14, textAlign: 'center' }}>
                      <button onClick={() => handleDelete(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <span role="img" aria-label="delete">🗑️</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <button style={{ 
              padding: '8px 24px', 
              background: '#1a73e8', 
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: 14,
              cursor: 'pointer'
            }}>
              Assign Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}