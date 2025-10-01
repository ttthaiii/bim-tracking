'use client';

import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

interface DashboardContextType {
  selectedProject: string | null;
  setSelectedProject: Dispatch<SetStateAction<string | null>>;
  selectedStatus: string | null;
  setSelectedStatus: Dispatch<SetStateAction<string | null>>;
}

const DashboardContext = createContext<DashboardContextType>({
  selectedProject: null,
  setSelectedProject: () => {}, // Fix: Provide a dummy function for initialization
  selectedStatus: null,
  setSelectedStatus: () => {},
});

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  return (
    // Fix: Pass setSelectedProject to the context provider
    <DashboardContext.Provider value={{ selectedProject, setSelectedProject, selectedStatus, setSelectedStatus }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);
