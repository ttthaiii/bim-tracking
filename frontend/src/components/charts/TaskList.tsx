import { useState, useEffect } from 'react';
import { Task } from '@/types/database';
import { getTaskDetails } from '@/services/dashboardService';

interface TaskListProps {
  projectId?: string;
}

export default function TaskList({ projectId }: TaskListProps) {
  const [tasks, setTasks] = useState<(Task & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const taskData = await getTaskDetails(projectId);
        setTasks(taskData);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Task Number
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Task Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Assignee
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Progress
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Due Date
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tasks.map((task) => (
            <tr key={task.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {task.taskNumber}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {task.taskName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {task.taskCategory}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {task.taskAssignee}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-200">
                    <div
                      style={{ width: `${(task.progress || 0) * 100}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                    ></div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {task.dueDate?.toDate().toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}