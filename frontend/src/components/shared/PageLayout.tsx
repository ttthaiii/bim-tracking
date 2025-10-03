import { ReactNode } from 'react';
import Navbar from './Navbar';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function PageLayout({ children, className = '' }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className={`max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16 ${className}`}> {/* Changed max-w-7xl to max-w-full */}
        {children}
      </main>
    </div>
  );
}