import React from 'react';
import { Task } from '@/types/task';

interface TaskTableProps {
  tasks: Task[];
}

export default function TaskTable({ tasks }: TaskTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Subtask ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Relate Drawing
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Activity
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Relate Work
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Internal Rev.
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Work Scale
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Assignee
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Deadline
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Progress
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Link File
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Correct
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tasks.map((task, index) => (
            <tr key={task.subtaskId}>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {task.subtaskId}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {task.relateDrawing}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {task.activity}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {task.relateWork}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {task.internalRev}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {task.workScale}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                <div className="flex items-center">
                  <span className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-2">
                    {task.assignee.charAt(0).toUpperCase()}
                  </span>
                  {task.assignee}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {task.deadline}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${task.progress}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 mt-1">{task.progress}%</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {task.linkFile && (
                  <a
                    href={task.linkFile}
                    className="text-blue-600 hover:text-blue-800"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                  </a>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {task.isCorrect ? (
                  <span className="text-green-600">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                ) : (
                  <span className="text-red-600">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}