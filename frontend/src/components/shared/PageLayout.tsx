// frontend/src/components/shared/PageLayout.tsx
import { ReactNode } from 'react';
import Navbar from './Navbar';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function PageLayout({ children, className = '' }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 text-black"> {/* ตรงนี้มี text-black อยู่แล้ว */}
      <Navbar />
      {/* ปรับ margin-top ให้เท่ากับความสูงของ Navbar */}
      <main className={`max-w-full mx-auto px-8 py-6 mt-16 ${className}`}> 
        {children}
      </main>
    </div>
  );
}
