import { createContext, useContext, useState, ReactNode } from 'react';
import { RecentActivity } from '@/services/dashboardService';

interface DashboardContextType {
  selectedStatus: string | null;
  setSelectedStatus: (status: string | null) => void;
  selectedActivity: RecentActivity | null;
  setSelectedActivity: (activity: RecentActivity | null) => void;
  filteredActivities: RecentActivity[];
  setFilteredActivities: (activities: RecentActivity[]) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<RecentActivity | null>(null);
  const [filteredActivities, setFilteredActivities] = useState<RecentActivity[]>([]);

  return (
    <DashboardContext.Provider
      value={{
        selectedStatus,
        setSelectedStatus,
        selectedActivity,
        setSelectedActivity,
        filteredActivities,
        setFilteredActivities,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}