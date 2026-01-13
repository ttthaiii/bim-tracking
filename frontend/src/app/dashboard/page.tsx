'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDashboardStats } from '@/services/dashboardService';
import PageLayout from '@/components/shared/PageLayout';
import ProjectStatusChart from '@/components/charts/ProjectStatusChart';
import DocumentStatusChart from '@/components/charts/DocumentStatusChart';
import WorkloadChart from '@/components/charts/WorkloadChart';
import ActivityTable from '@/components/tables/ActivityTable';

import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Project {
  id: string;
  name: string;
}

import { DashboardProvider, useDashboard } from '@/context/DashboardContext';

import DailyReportView from './components/DailyReportView';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'daily_report'>('overview');

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
    if (activeTab === 'overview') {
      setLoading(true);
      getDashboardStats(selectedProject !== 'all' ? (selectedProject ?? undefined) : undefined)
        .then(statsData => {
          setStats(statsData);
        })
        .finally(() => setLoading(false));
    }
  }, [selectedProject, activeTab]);

  const handleProjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProject(event.target.value === 'all' ? null : event.target.value);
  };

  return (
    <PageLayout>
      <div className="space-y-6"> {/* Added space-y-6 for consistent vertical spacing between sections */}

        {/* Header & Tabs */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0"> {/* Adjusted for responsiveness */}
            <h1 className="text-3xl font-bold text-gray-800 min-w-0 break-words">Project Dashboard</h1> {/* Added min-w-0 break-words */}

            {activeTab === 'overview' && (
              <select
                onChange={handleProjectChange}
                value={selectedProject || 'all'}
                className="w-full md:w-auto p-2 border rounded-md bg-white shadow-sm" // Added w-full for mobile
              >
                <option value="all">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('overview')}
                className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${activeTab === 'overview'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('daily_report')}
                className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${activeTab === 'daily_report'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
              >
                Daily Report
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <>
            {/* Statistics Cards or other overview content can go here */}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6 overflow-x-auto"> {/* Added overflow-x-auto */}
                <ProjectStatusChart />
              </div>

              <div className="bg-white rounded-lg shadow p-6 overflow-x-auto"> {/* Added overflow-x-auto */}
                <DocumentStatusChart />
              </div>

              <div className="col-span-1 md:col-span-2 bg-white rounded-lg shadow p-6 overflow-x-auto"> {/* Adjusted col-span for mobile, added overflow-x-auto */}
                <h2 className="text-lg font-semibold mb-4 text-gray-800">Team Workload Distribution</h2>
                <WorkloadChart />
              </div>
            </div>

            {/* Recent Activities Table */}
            <div className="mt-6 bg-white rounded-lg shadow p-6 overflow-x-auto"> {/* Added overflow-x-auto */}
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Table Data</h2>
              <ActivityTable />
            </div>
          </>
        ) : (
          <div className="mt-6">
            <DailyReportView />
          </div>
        )}
      </div>
    </PageLayout>
  );
}
