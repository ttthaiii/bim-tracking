'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDashboardStats } from '@/services/dashboardService';
import PageLayout from '@/components/shared/PageLayout';
import ProjectStatusChart from '@/components/charts/ProjectStatusChart';
import DocumentStatusChart from '@/components/charts/DocumentStatusChart'; // Corrected Import
import WorkloadChart from '@/components/charts/WorkloadChart';
import ActivityTable from '@/components/tables/ActivityTable';
import { getRecentActivities } from '@/services/dashboardService';
import type { RecentActivity } from '@/services/dashboardService';

import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface Project {
  id: string;
  name: string;
}

import { DashboardProvider } from '@/context/DashboardContext';

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}

function DashboardContent() {
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({
    projectCount: 0,
    activeTaskCount: 0,
    teamMemberCount: 0,
    completionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    const fetchProjects = async () => {
      const projectsRef = collection(db, 'projects');
      const snapshot = await getDocs(projectsRef);
      const projectsList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || doc.id
      }));
      setProjects(projectsList);
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getDashboardStats(selectedProject !== 'all' ? selectedProject : undefined),
      getRecentActivities()
    ]).then(([statsData, activitiesData]) => {
      setStats(statsData);
      setActivities(activitiesData);
    }).finally(() => setLoading(false));
  }, [selectedProject]);

  return (
    <PageLayout>
      <div>
        <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold">Project Dashboard</h1>
            </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* ... Stats Cards ... */}
        </div>
        
        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <ProjectStatusChart />
          </div>
          
          {/* CORRECTED: Replaced the old chart with the new DocumentStatusChart */}
          <div className="bg-white rounded-lg shadow p-6">
            <DocumentStatusChart />
          </div>

          <div className="col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Team Workload Distribution</h2>
            <WorkloadChart />
          </div>
        </div>

        {/* Recent Activities Table */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Activities</h2>
          <ActivityTable activities={activities} />
        </div>
      </div>
    </PageLayout>
  );
}
