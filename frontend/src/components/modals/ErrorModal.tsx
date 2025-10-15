import React from 'react';

interface ErrorModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, message, onClose }) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', textAlign: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', width: '90%', maxWidth: '400px' }}>
        <div style={{ fontSize: '3rem', color: '#ef4444' /* สีแดง */ }}>
          ✕
        </div>
        <h3 style={{ marginTop: '1rem', color: '#b91c1c' }}>เกิดข้อผิดพลาด</h3>
        <p style={{ color: '#4b5563', marginBottom: '2rem' }}>{message}</p>
        <button
          onClick={onClose}
          style={{ padding: '0.5rem 1.5rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}
        >
          ปิด
        </button>
      </div>
    </div>
  );
};

export default ErrorModal;