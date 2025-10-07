'use client';

import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useCallback, useEffect } from 'react';

interface DashboardContextType {
  selectedProject: string | null;
  setSelectedProject: Dispatch<SetStateAction<string | null>>;
  selectedStatus: string | null;
  setSelectedStatus: Dispatch<SetStateAction<string | null>>;
  excludedStatuses: string[];
  setExcludedStatuses: Dispatch<SetStateAction<string[]>>;
  toggleStatus: (status: string) => void;
  selectOnlyStatus: (status: string) => void;
  
  // New state for unsaved changes
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>;
}

const DashboardContext = createContext<DashboardContextType>({
  selectedProject: null,
  setSelectedProject: () => {},
  selectedStatus: null,
  setSelectedStatus: () => {},
  excludedStatuses: [],
  setExcludedStatuses: () => {},
  toggleStatus: () => {},
  selectOnlyStatus: () => {},
  hasUnsavedChanges: false,
  setHasUnsavedChanges: () => {},
});

const ALL_STATUSES = ['เสร็จสิ้น', 'รออนุมัติจาก CM', 'รอตรวจสอบหน้างาน', 'รอแก้ไขแบบ BIM', 'กำลังดำเนินการ-BIM', 'วางแผนแล้ว-BIM', 'ยังไม่วางแผน-BIM'];

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [excludedStatuses, setExcludedStatuses] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  useEffect(() => {
    console.log('[DashboardContext] Final state of excludedStatuses:', excludedStatuses);
  }, [excludedStatuses]);

  const toggleStatus = useCallback((status: string) => {
    console.log(`[DashboardContext] ACTION: toggleStatus for "${status}"`);
    setExcludedStatuses(prev => {
      console.log('[DashboardContext]   - Before toggle:', prev);
      const newStatuses = prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status];
      console.log('[DashboardContext]   - After toggle:', newStatuses);
      return newStatuses;
    });
  }, []);

  const selectOnlyStatus = useCallback((status: string) => {
    console.log(`[DashboardContext] ACTION: selectOnlyStatus for "${status}"`);
    setExcludedStatuses(prev => {
      console.log('[DashboardContext]   - Before selectOnly:', prev);
      const isAlreadyTheOnlyOne = prev.length === ALL_STATUSES.length - 1 && !prev.includes(status);

      if (isAlreadyTheOnlyOne) {
        console.log('[DashboardContext]   - Logic: Resetting to show all statuses.');
        return [];
      } else {
        const newStatuses = ALL_STATUSES.filter(s => s !== status);
        console.log('[DashboardContext]   - Logic: Filtering to show only one:', newStatuses);
        return newStatuses;
      }
    });
  }, []);

  const value = {
    selectedProject,
    setSelectedProject,
    selectedStatus,
    setSelectedStatus,
    excludedStatuses,
    setExcludedStatuses,
    toggleStatus,
    selectOnlyStatus,
    hasUnsavedChanges,
    setHasUnsavedChanges,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);
