'use client';

import { useState } from 'react';
import PageLayout from '@/components/shared/PageLayout';
import DocumentStatusChart from '@/components/charts/DocumentStatusChart';
import TaskList from '@/components/charts/TaskList';

export default function DocumentTrackingPage() {
  const [selectedProject, setSelectedProject] = useState<string | undefined>();

  return (
    <PageLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Document Tracking Dashboard</h1>
        
        {/* Document Status Overview */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Document Status Overview</h2>
          <DocumentStatusChart />
        </div>

        {/* Task List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Task List</h2>
          <TaskList projectId={selectedProject} />
        </div>
      </div>
    </PageLayout>
  );
}