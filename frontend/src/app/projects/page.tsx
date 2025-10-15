// frontend/src/app/projects/page.tsx

'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const ProjectTaskView = dynamic(
  () => import('./components/ProjectTaskView'),
  { 
    ssr: false,
    loading: () => (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        background: '#f0f2f5', 
        color: '#666' 
      }}>
        กำลังเตรียมหน้าจัดการโปรเจกต์...
      </div>
    )
  }
);

export default function ProjectsPage() {
  return <ProjectTaskView />;
}