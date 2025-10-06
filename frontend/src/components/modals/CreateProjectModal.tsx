import React from 'react';
import ConfirmModal from './ConfirmModal';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (projectData: { name: string; code: string; leader: string }) => void;
  onViewProjects: () => void;
}

const CreateProjectModal = ({ isOpen, onClose, onSubmit, onViewProjects }: CreateProjectModalProps) => {
  const [projectData, setProjectData] = React.useState({
    name: '',
    code: '',
    leader: ''
  });

  const [showConfirm, setShowConfirm] = React.useState(false);
  const [pendingData, setPendingData] = React.useState<{name: string; code: string; leader: string} | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPendingData(projectData);
    setShowConfirm(true);
  };

  const handleConfirmCreate = () => {
    if (pendingData) {
      onSubmit(pendingData);
      setProjectData({ name: '', code: '', leader: '' });
      setPendingData(null);
    }
    setShowConfirm(false);
  };

  const handleCancelCreate = () => {
    setShowConfirm(false);
    setPendingData(null);
  };

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div 
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '0.5rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            width: '100%',
            maxWidth: '32rem',
            transform: 'scale(1)',
            transition: 'all 0.2s ease-in-out',
          }}
        >
          <div style={{ padding: '1.5rem' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h2 style={{ 
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#1f2937'
              }}>
                Create New Project
              </h2>
              <button
                onClick={onClose}
                style={{
                  color: '#6b7280',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: '0.5rem',
                }}
              >
                <svg 
                  style={{ width: '1.5rem', height: '1.5rem' }} 
                  fill="none" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {/* ปุ่มดูสถานะโปรเจกต์ */}
            <button
              type="button"
              onClick={onViewProjects}
              style={{
                width: '100%',
                padding: '0.75rem',
                marginBottom: '1rem',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              📊 ดูสถานะโปรเจกต์ทั้งหมด
            </button>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  PROJECT NAME
                </label>
                <input
                  type="text"
                  value={projectData.name}
                  onChange={(e) => setProjectData(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all 0.2s',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  }}
                  placeholder="Enter project name"
                  required
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  PROJECT CODE
                </label>
                <input
                  type="text"
                  value={projectData.code}
                  onChange={(e) => setProjectData(prev => ({ ...prev, code: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all 0.2s',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  }}
                  placeholder="Enter project code"
                  required
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  LEADER
                </label>
                <input
                  type="text"
                  value={projectData.leader}
                  onChange={(e) => setProjectData(prev => ({ ...prev, leader: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all 0.2s',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  }}
                  placeholder="Enter leader name"
                  required
                />
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: '0.75rem',
                marginTop: '1.5rem'
              }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#6b7280',
                    cursor: 'pointer',
                    backgroundColor: 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1.5rem',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'white',
                    backgroundColor: '#3b82f6',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title="ยืนยันการสร้างโปรเจกต์"
        message={`คุณต้องการสร้างโปรเจกต์ "${pendingData?.name}" (${pendingData?.code}) โดยมี ${pendingData?.leader} เป็น Leader หรือไม่?`}
        onConfirm={handleConfirmCreate}
        onCancel={handleCancelCreate}
        confirmText="สร้างโปรเจกต์"
        confirmColor="#10b981"
      />
    </>
  );
};

export default CreateProjectModal;