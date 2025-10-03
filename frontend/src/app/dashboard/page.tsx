'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDashboardStats } from '@/services/dashboardService';
import PageLayout from '@/components/shared/PageLayout';
import ProjectStatusChart from '@/components/charts/ProjectStatusChart';
import DocumentStatusChart from '@/components/charts/DocumentStatusChart';
import WorkloadChart from '@/components/charts/WorkloadChart';
import ActivityTable from '@/components/tables/ActivityTable';

import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface Project {
  id: string;
  name: string;
}

import { DashboardProvider, useDashboard } from '@/context/DashboardContext';

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}

function DashboardContent() {
  const { selectedProject, setSelectedProject } = useDashboard(); // Using context for project selection
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({
    projectCount: 0,
    activeTaskCount: 0,
    teamMemberCount: 0,
    completionRate: 0
  });
  const [loading, setLoading] = useState(true);

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
    getDashboardStats(selectedProject !== 'all' ? (selectedProject ?? undefined) : undefined)
      .then(statsData => {
        setStats(statsData);
      })
      .finally(() => setLoading(false));
  }, [selectedProject]);

  const handleProjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProject(event.target.value === 'all' ? null : event.target.value);
  };

  return (
    <PageLayout>
      <div>
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-800">Project Dashboard</h1>
            <select 
              onChange={handleProjectChange}
              value={selectedProject || 'all'}
              className="p-2 border rounded-md bg-white shadow-sm"
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Stats */}
        {/* ... Stats Cards can be added here ... */}
        
        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <ProjectStatusChart />
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <DocumentStatusChart />
          </div>

          <div className="col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Team Workload Distribution</h2>
            <WorkloadChart />
          </div>
        </div>

        {/* Recent Activities Table */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Activities</h2>
          <ActivityTable />
        </div>
      </div>
    </PageLayout>
  );
}
