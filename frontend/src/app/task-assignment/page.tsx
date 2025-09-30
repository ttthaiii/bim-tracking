'use client';

import { useState } from 'react';
import PageLayout from '@/components/shared/PageLayout';
import TaskTable from '@/components/task-assignment/TaskTable';
import { Task } from '@/types/task';

export default function TaskAssignmentPage() {
  const [projectName, setProjectName] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([
    {
      subtaskId: 'BIM-WS-001-001',
      relateDrawing: 'Framing Plans',
      activity: 'Auto',
      relateWork: 'Framing Plans',
      internalRev: 1,
      workScale: 5,
      assignee: 'warin',
      deadline: '8 Day',
      progress: 0,
      isCorrect: false
    },
    {
      subtaskId: 'BIM-WS-001-002',
      relateDrawing: 'Framing Plans',
      activity: 'Auto',
      relateWork: 'Framing Plans',
      internalRev: 2,
      workScale: 4,
      assignee: 'warinthon',
      deadline: '2 Day',
      progress: 0,
      isCorrect: false
    }
  ]);

  return (
    <PageLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Task Assignment</h1>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Project Name:</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
          <TaskTable tasks={tasks} />
        </div>

        <div className="flex justify-end">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Assign Task
          </button>
        </div>
      </div>
    </PageLayout>
  );
}