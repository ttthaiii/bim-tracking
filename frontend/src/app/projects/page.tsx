// frontend/src/app/projects/page.tsx

'use client'; // <--- เพิ่มบรรทัดนี้เข้ามาครับ!

import dynamic from 'next/dynamic';
import React from 'react';

// ใช้ Dynamic Import เพื่อโหลด Component ตารางข้อมูลแบบ Client-Side เท่านั้น
// ssr: false คือการบอกว่า "ห้าม Render Component นี้บน Server เด็ดขาด"
const ProjectTaskView = dynamic(
  () => import('./components/ProjectTaskView'),
  { 
    ssr: false,
    // ระหว่างรอโหลด Component หลัก ให้แสดงข้อความนี้ไปก่อน
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

// Component ของหน้าเพจจะเหลือแค่นี้
export default function ProjectsPage() {
  return <ProjectTaskView />;
}