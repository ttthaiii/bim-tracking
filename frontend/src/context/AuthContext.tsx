'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User as AppUser } from '@/types/database';

interface AuthContextType {
  currentUser: boolean;
  appUser: AppUser | null;
  loading: boolean;
  logout: () => void;
  loginUser: (userData: AppUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<boolean>(false);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const storedUser = localStorage.getItem('loggedInUser');

    if (isLoggedIn === 'true' && storedUser) {
      try {
        setCurrentUser(true);
        setAppUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('loggedInUser');
        setCurrentUser(false);
        setAppUser(null);
      }
    } else {
      setCurrentUser(false);
      setAppUser(null);
    }
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('loggedInUser');
    setCurrentUser(false);
    setAppUser(null);
    router.push('/login');
  };

  // New function to handle login from external components (e.g., login page)
  const loginUser = (userData: AppUser) => {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('loggedInUser', JSON.stringify(userData));
    setCurrentUser(true);
    setAppUser(userData);
    router.push('/dashboard'); // Changed redirect to home page
  };

  // Redirect logic
  useEffect(() => {
    if (!loading) {
      if (!currentUser && pathname !== '/login') {
        router.push('/login');
      } else if (currentUser && pathname === '/login') {
        router.push('/dashboard');
      }
    }
  }, [currentUser, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ currentUser, appUser, loading, logout, loginUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}