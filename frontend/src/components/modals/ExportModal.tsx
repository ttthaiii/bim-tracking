import React, { useState } from 'react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: any) => void;
  projects: any[];
  currentProjectId: string;
}

const ExportModal = ({ isOpen, onClose, onExport, projects, currentProjectId }: ExportModalProps) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProject, setSelectedProject] = useState(currentProjectId);
  const [exportType, setExportType] = useState<'simple' | 'gantt'>('simple');
  
  if (!isOpen) return null;
  
  const handleExport = () => {
    onExport({
      startDate,
      endDate,
      projectId: selectedProject,
      exportType
    });
    onClose();
  };
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '32rem',
        padding: '1.5rem',
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
          📊 Export to Excel
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Export Type */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem', display: 'block' }}>
              📊 Export Format
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="simple"
                  checked={exportType === 'simple'}
                  onChange={() => setExportType('simple')}
                />
                <span style={{ fontSize: '0.875rem' }}>📋 Simple Table</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="gantt"
                  checked={exportType === 'gantt'}
                  onChange={() => setExportType('gantt')}
                />
                <span style={{ fontSize: '0.875rem' }}>📊 Gantt Chart</span>
              </label>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
              📅 Date Range (Optional)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
              <span style={{ display: 'flex', alignItems: 'center' }}>→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>
          
          {/* Project Filter */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
              🏢 Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.5rem',
                padding: '0.5rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          
          {/* Quick Presets */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem', display: 'block' }}>
              ⚡ Quick Select
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                  setStartDate(firstDay.toISOString().split('T')[0]);
                  setEndDate(today.toISOString().split('T')[0]);
                }}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  background: 'white'
                }}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                  const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                  setStartDate(firstDay.toISOString().split('T')[0]);
                  setEndDate(lastDay.toISOString().split('T')[0]);
                }}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  background: 'white'
                }}
              >
                Last Month
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
                  setStartDate(threeMonthsAgo.toISOString().split('T')[0]);
                  setEndDate(today.toISOString().split('T')[0]);
                }}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  background: 'white'
                }}
              >
                Last 3 Months
              </button>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
              background: 'white'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            style={{
              padding: '0.5rem 1.5rem',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              color: 'white',
              background: '#10b981',
              cursor: 'pointer'
            }}
          >
            📥 Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;