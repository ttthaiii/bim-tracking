import React from 'react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  taskName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({ 
  isOpen, 
  taskName, 
  onConfirm, 
  onCancel 
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

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
        maxWidth: '400px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px',
            background: '#fee2e2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
            </svg>
          </div>

          <h3 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#111827',
            margin: '0 0 8px 0'
          }}>
            ยืนยันการลบ
          </h3>

          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: '0 0 4px 0'
          }}>
            คุณต้องการลบเอกสารนี้หรือไม่?
          </p>

          <p style={{
            fontSize: '13px',
            color: '#dc2626',
            fontWeight: 500,
            margin: 0
          }}>
            {taskName}
          </p>
        </div>

        <div style={{
          padding: '16px 24px',
          background: '#f9fafb',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
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
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#fff',
              background: '#dc2626',
              cursor: 'pointer'
            }}
          >
            ลบ
          </button>
        </div>
      </div>
    </div>
  );
}