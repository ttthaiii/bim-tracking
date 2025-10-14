import React, { useState } from 'react';
import ConfirmModal from './ConfirmModal';

interface Project {
  id: string;
  name: string;
  abbr: string;
  projectAssignee?: string;
  createdAt: any;
}

interface ProjectListModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onUpdateLeader: (projectId: string, newLeader: string) => void;
}

const ProjectListModal = ({ isOpen, onClose, projects, onUpdateLeader }: ProjectListModalProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLeader, setEditLeader] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{
    projectId: string;
    projectName: string;
    newLeader: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleEdit = (project: Project) => {
    setEditingId(project.id);
    setEditLeader(project.projectAssignee || '');
  };

  const handleSave = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setPendingUpdate({
        projectId,
        projectName: project.name,
        newLeader: editLeader,
      });
      setShowConfirm(true);
    }
  };

  const handleConfirmUpdate = () => {
    if (pendingUpdate) {
      onUpdateLeader(pendingUpdate.projectId, pendingUpdate.newLeader);
      setEditingId(null);
      setEditLeader('');
      setPendingUpdate(null);
    }
    setShowConfirm(false);
  };

  const handleCancelUpdate = () => {
    setShowConfirm(false);
    setPendingUpdate(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditLeader('');
  };

  return (
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
          maxWidth: '50rem',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#1f2937',
              }}
            >
              สถานะโปรเจกต์ทั้งหมด
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
        </div>

        <div style={{ overflowY: 'auto', padding: '1.5rem' }}>
          {projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
              ยังไม่มีโปรเจกต์
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th
                    style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    Project Name
                  </th>
                  <th
                    style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    Code
                  </th>
                  <th
                    style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    Leader
                  </th>
                  <th
                    style={{
                      padding: '0.75rem',
                      textAlign: 'center',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#1f2937' }}>
                      {project.name}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {project.abbr}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      {editingId === project.id ? (
                        <input
                          type="text"
                          value={editLeader}
                          onChange={(e) => setEditLeader(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #3b82f6',
                            borderRadius: '0.25rem',
                            fontSize: '0.875rem',
                            outline: 'none',
                          }}
                          autoFocus
                        />
                      ) : (
                        <span style={{ color: '#1f2937' }}>{project.projectAssignee || '-'}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {editingId === project.id ? (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleSave(project.id)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                          >
                            บันทึก
                          </button>
                          <button
                            onClick={handleCancel}
                            style={{
                              padding: '0.375rem 0.75rem',
                              background: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(project)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontWeight: 500,
                          }}
                        >
                          แก้ไข
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ✅ Confirm Modal Section */}
        <ConfirmModal
          isOpen={showConfirm}
          title="ยืนยันการเปลี่ยน Leader"
          message={`คุณต้องการเปลี่ยน Leader ของโปรเจกต์ "${pendingUpdate?.projectName}" เป็น "${pendingUpdate?.newLeader}" หรือไม่?`}
          onConfirm={handleConfirmUpdate}
          onCancel={handleCancelUpdate}
          confirmText="ยืนยันการเปลี่ยนแปลง"
          confirmColor="#f59e0b"
        />
      </div>
    </div>
  );
};

export default ProjectListModal;
