'use client';

import { useState, useEffect } from 'react';
import { getDashboardStats } from '@/services/dashboardService';
import PageLayout from '@/components/shared/PageLayout';
import ProjectStatusChart from '@/components/charts/ProjectStatusChart';
import ProjectProgressChart from '@/components/charts/ProjectProgressChart';
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

export default function DashboardPage() {
  // สำหรับกรองข้อมูลตามโครงการ
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
  const [selectedActivity, setSelectedActivity] = useState<RecentActivity | null>(null);

  // Fetch projects on component mount
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

  // Fetch stats when selected project changes
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getDashboardStats(selectedProject !== 'all' ? selectedProject : undefined),
      getRecentActivities(100) // เพิ่มจำนวน activities ที่ต้องการดึง
    ]).then(([statsData, activitiesData]) => {
      setStats(statsData);
      setActivities(activitiesData);
    }).finally(() => setLoading(false));
  }, [selectedProject]);

  return (
    <PageLayout>
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Project Dashboard</h1>
          
          {/* Filter Controls */}
          <div className="flex items-center space-x-4">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="block w-48 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            {/* Date Range Picker (ตัวอย่าง UI) */}
            <div className="flex items-center space-x-2">
              <input
                type="date"
                className="block px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <span>to</span>
              <input
                type="date"
                className="block px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Projects</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {loading ? '-' : stats.projectCount}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Active Tasks</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {loading ? '-' : stats.activeTaskCount}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Team Members</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {loading ? '-' : stats.teamMemberCount}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Completion Rate</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {loading ? '-' : `${stats.completionRate}%`}
            </p>
          </div>
        </div>
        
        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project Status Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <ProjectStatusChart projectId={selectedProject !== 'all' ? selectedProject : undefined} />
          </div>
          
          {/* Project Progress */}
          <div className="bg-white rounded-lg shadow p-6">
            <ProjectProgressChart projectId={selectedProject !== 'all' ? selectedProject : undefined} />
          </div>

          {/* Additional charts can be added here */}
          <div className="col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Team Workload Distribution</h2>
            <WorkloadChart projectId={selectedProject !== 'all' ? selectedProject : undefined} />
          </div>
        </div>

        {/* Recent Activities */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activities</h2>
          <ActivityTable 
            activities={activities} 
            onActivitySelect={(activity) => {
              setSelectedActivity(activity);
              // ทำการ update charts ตามข้อมูลที่เลือก
              // สามารถส่ง prop ไปยัง charts เพื่อ highlight ข้อมูลที่เกี่ยวข้องได้
            }} 
          />
        </div>
      </div>
    </PageLayout>
  );
}