'use client';

import PageLayout from '@/components/shared/PageLayout';
import ProjectStatusChart from '@/components/charts/ProjectStatusChart';
import ProjectProgressChart from '@/components/charts/ProjectProgressChart';
import WorkloadChart from '@/components/charts/WorkloadChart';

export default function DashboardPage() {
  return (
    <PageLayout>
      <div>
        <h1 className="text-3xl font-bold mb-8">Project Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project Status Distribution */}
          <div className="col-span-1">
            <ProjectStatusChart />
          </div>
          
          {/* Project Progress */}
          <div className="col-span-1">
            <ProjectProgressChart />
          </div>

          {/* Workload Distribution */}
          <div className="col-span-2">
            <WorkloadChart />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}