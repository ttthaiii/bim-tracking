'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/context/DashboardContext'; // Import useDashboard
import { ConfirmationPopup } from '@/components/ConfirmationPopup'; // Import ConfirmationPopup
import { useState } from 'react';

const navItems = [
  //{ name: 'Home', path: '/' },
  { name: 'Projects Planing', path: '/projects' },
  { name: 'Task Assignment', path: '/tasks' }, 
  { name: 'Daily Report', path: '/daily-report' },
  { name: 'Dashboard Report', path: '/dashboard' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, appUser, logout } = useAuth(); 
  const { hasUnsavedChanges, setHasUnsavedChanges } = useDashboard();
  
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    if (hasUnsavedChanges && path !== pathname) {
      setNextPath(path);
      setIsPopupOpen(true);
    } else {
      router.push(path);
    }
  };

  const handleConfirmLeave = () => {
    if (nextPath) {
      setHasUnsavedChanges(false);
      router.push(nextPath);
    }
    setIsPopupOpen(false);
    setNextPath(null);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setNextPath(null);
  };

  return (
    <>
      <nav className="bg-white shadow-lg fixed top-0 left-0 right-0 z-50"> 
        <div className="w-full mx-auto px-10">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" onClick={(e) => handleLinkClick(e, '/')}>
                  <span className="text-2xl font-bold text-blue-600">BIM Tracking</span>
                </Link>
              </div>

              {/* Navigation Items */}
              {currentUser && (
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={(e) => handleLinkClick(e, item.path)}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        pathname === item.path
                          ? 'border-blue-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Profile/Settings Dropdown or Login/Logout */}
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              {currentUser ? (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={logout}
                    className="px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    ออกจากระบบ
                  </button>
                  <div className="flex flex-col items-end">
                    <span className="text-gray-700 text-sm font-medium">
                      {appUser?.fullNameEn || appUser?.username || 'ผู้ใช้งาน'}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {appUser?.role || 'ไม่มีตำแหน่ง'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-sm"></div>
              )}
            </div>

            {/* Mobile menu button (unchanged for now) */}
            <div className="sm:hidden flex items-center">
              {/* ... mobile button ... */}
            </div>
          </div>
        </div>
      </nav>

      <ConfirmationPopup
        isOpen={isPopupOpen}
        onClose={handleClosePopup}
        onConfirm={handleConfirmLeave}
        title="ออกจากหน้านี้?"
        message="คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้โดยไม่บันทึกหรือไม่?"
        confirmText="ใช่, ออกจากหน้า"
        cancelText="ไม่, อยู่ต่อ"
      />
    </>
  );
}
