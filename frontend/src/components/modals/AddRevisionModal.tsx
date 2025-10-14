import React, { useState, useEffect } from 'react';

interface Task {
  id: string;
  taskName: string;
  taskCategory: string;
  currentStep: string;
  rev: string;
}

interface AddRevisionModalProps {
  isOpen: boolean;
  tasks: Task[];
  onSelect: (task: Task) => void;
  onClose: () => void;
}

export default function AddRevisionModal({ isOpen, tasks, onSelect, onClose }: AddRevisionModalProps) {
  if (!isOpen) return null;

  // กรองเฉพาะเอกสารที่ต้องแก้ไข
// กรองเฉพาะเอกสารที่ต้องแก้ไข และยังไม่มี Rev. ถัดไปในตาราง
const needsRevision = tasks.filter(t => {
  // ต้องมีสถานะที่ต้องแก้ไข
  if (t.currentStep !== 'APPROVED_REVISION_REQUIRED' && t.currentStep !== 'REJECTED') {
    return false;
  }
  
  // ชื่อเอกสารต้นฉบับ (ลบ REV.xx ออก)
  const baseName = t.taskName.replace(/\s+REV\.\d+$/i, '');
  const currentRev = parseInt(t.rev || '0');
  const nextRev = String(currentRev + 1).padStart(2, '0');
  const nextRevName = `${baseName} REV.${nextRev}`;
  
  // เช็คว่ามี Rev. ถัดไปในตารางแล้วหรือยัง
  const hasNextRev = tasks.some(task => 
    task.taskName === nextRevName || 
    task.taskName.replace(/\s+REV\.\d+$/i, '') === baseName && 
    parseInt(task.rev || '0') > currentRev
  );
  
  return !hasNextRev;
});

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      backgroundColor: 'rgba(0, 0, 0, 0.5)'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '70vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#111827',
            margin: 0
          }}>
            เลือกเอกสารที่ต้องการสร้าง Revision ใหม่
          </h2>
          <p style={{
            fontSize: '13px',
            color: '#6b7280',
            margin: '6px 0 0 0'
          }}>
            {needsRevision.length} เอกสารที่ต้องแก้ไข
          </p>
        </div>

        <div style={{
          padding: '16px',
          overflowY: 'auto',
          flex: 1
        }}>
          {needsRevision.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#9ca3af'
            }}>
              <p style={{ fontSize: '14px', margin: 0 }}>
                ไม่มีเอกสารที่ต้องแก้ไข
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {needsRevision.map((task) => (
                <button
                  key={task.id}
                  onClick={() => {
                    onSelect(task);
                    onClose();
                  }}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    background: '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    gap: '12px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#111827',
                        marginBottom: '4px'
                      }}>
                        {task.taskName}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: '#6b7280'
                      }}>
                        {task.taskCategory} • Rev. {task.rev}
                      </div>
                    </div>
                    <div>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: task.currentStep === 'REJECTED' ? '#fee2e2' : '#fef3c7',
                        color: task.currentStep === 'REJECTED' ? '#991b1b' : '#92400e',
                        fontSize: '10px',
                        fontWeight: 500
                      }}>
                        {task.currentStep === 'REJECTED' ? 'ไม่อนุมัติ' : 'ต้องแก้ไข'}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          background: '#f9fafb'
        }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}