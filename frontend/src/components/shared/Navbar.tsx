      'use client';

      import Link from 'next/link';
      import { usePathname } from 'next/navigation';
      import { useAuth } from '@/context/AuthContext'; // Import useAuth hook

      const navItems = [
        { name: 'Home', path: '/' },
        { name: 'Projects Planing', path: '/projects' },
        { name: 'Task Assignment', path: '/tasks' }, 
        { name: 'Daily Report', path: '/daily-report' },
        { name: 'Dashboard Report', path: '/dashboard' },
      ];

      export default function Navbar() {
        const pathname = usePathname();
        const { currentUser, appUser, logout } = useAuth(); 

        return (
          <nav className="bg-white shadow-lg fixed top-0 left-0 right-0 z-50"> 
            <div className="w-full mx-auto px-10"> {/* Changed max-w-7xl and px-4/sm:px-6/lg:px-8 to w-full px-10 */}
              <div className="flex justify-between h-16">
                <div className="flex">
                  {/* Logo */}
                  <div className="flex-shrink-0 flex items-center">
                    <Link href="/" className="text-2xl font-bold text-blue-600">
                      BIM Tracking
                    </Link>
                  </div>

                  {/* Navigation Items - show only if logged in */}
                  {currentUser && (
                    <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                      {navItems.map((item) => (
                        <Link
                          key={item.path}
                          href={item.path}
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
                      {/* Logout Button - now on the left */}
                      <button
                        onClick={logout}
                        className="px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        ออกจากระบบ
                      </button>
                      {/* User Info (Name and Role) - now on the right */}
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
                  <button
                    type="button"
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                    aria-expanded="false"
                  >
                    <span className="sr-only">Open main menu</span>
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile menu panel (unchanged for now) */}
            <div className="sm:hidden hidden">
              <div className="pt-2 pb-3 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                      pathname === item.path
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        );
      }