import { ReactNode } from 'react';
import Navbar from './Navbar';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function PageLayout({ children, className = '' }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 text-black"> 
      <Navbar />
      {/* ลบ padding ออกจาก main โดยตรง ให้เนื้อหาในแต่ละหน้าจัดการเอง */}
      <main className={`max-w-full mx-auto px-1 py-0.5  mt-10 ${className}`}> {/* Removed px-8 py-6 */}
        {children}
      </main>
    </div>
  );
}