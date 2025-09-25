'use client';

import { useState } from 'react';
import PageLayout from '@/components/shared/PageLayout';
import ProjectStatusChart from '@/components/charts/ProjectStatusChart';
import ProjectProgressChart from '@/components/charts/ProjectProgressChart';
import WorkloadChart from '@/components/charts/WorkloadChart';
import RecentActivitiesTable from '@/components/charts/RecentActivitiesTable';

export default function DashboardPage() {
  // สำหรับกรองข้อมูลตามโครงการ
  const [selectedProject, setSelectedProject] = useState<string>('all');

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
              <option value="project1">Project 1</option>
              <option value="project2">Project 2</option>
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
            <p className="mt-1 text-2xl font-semibold text-gray-900">12</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Active Tasks</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">48</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Team Members</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">24</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Completion Rate</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">75%</p>
          </div>
        </div>
        
        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project Status Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <ProjectStatusChart />
          </div>
          
          {/* Project Progress */}
          <div className="bg-white rounded-lg shadow p-6">
            <ProjectProgressChart />
          </div>

          {/* Additional charts can be added here */}
          <div className="col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Team Workload Distribution</h2>
            <WorkloadChart />
          </div>
        </div>

        {/* Recent Activities */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activities</h2>
          <RecentActivitiesTable />
        </div>
      </div>
    </PageLayout>
  );
}