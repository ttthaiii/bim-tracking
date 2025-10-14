import React from 'react';
// 1. แก้ไข: เปลี่ยนการ import จาก Task เป็น Subtask
import { Subtask } from '@/types/database'; 

// 2. แก้ไข: Props ควรจะมีฟังก์ชันสำหรับการโต้ตอบกับ UI ด้วย (เช่นการเลือก)
// ถ้าไม่มีฟังก์ชันเหล่านี้ ให้ใช้ interface แบบเดิมไปก่อน
interface TaskTableProps {
  tasks: Subtask[]; // 3. แก้ไข: เปลี่ยนชนิดข้อมูลเป็น Subtask[]
  // onTaskToggle?: (subtaskId: string) => void;
  // selectedTasks?: Set<string>;
}

// Helper function สำหรับแปลง Timestamp เป็น String (dd/mm/yyyy)
function formatDate(timestamp: any) {
  if (!timestamp || !timestamp.toDate) {
    return 'N/A';
  }
  return timestamp.toDate().toLocaleDateString('th-TH');
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
              Relate Drawing / Item
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Activity / Category
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Relate Work / Parent Task
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
              Deadline / End Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Progress
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Link File
            </th>
            {/* ผมได้เอาคอลัมน์ Correct ออกไปก่อน เพราะไม่มีข้อมูลเทียบเท่าใน Subtask */}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {/* 4. แก้ไข: เปลี่ยนชื่อตัวแปรเป็น subtask เพื่อความชัดเจน */}
          {tasks.map((subtask) => (
            // 5. แก้ไข: เปลี่ยน key และการเรียกใช้ property ทั้งหมดให้ตรงกับ Subtask
            <tr key={subtask.id}>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {subtask.subTaskNumber || subtask.id}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {subtask.item}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {subtask.subTaskCategory}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {subtask.taskName}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {subtask.internalRev}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {subtask.subTaskScale}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                <div className="flex items-center">
                  {subtask.subTaskAssignee && (
                    <>
                      <span className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-2">
                        {subtask.subTaskAssignee.charAt(0).toUpperCase()}
                      </span>
                      {subtask.subTaskAssignee}
                    </>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {formatDate(subtask.endDate)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${subtask.subTaskProgress || 0}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 mt-1">{subtask.subTaskProgress || 0}%</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {subtask.subTaskFiles && subtask.subTaskFiles.length > 0 && (
                  <a
                    href={subtask.subTaskFiles[0]} // ลิงก์ไปยังไฟล์แรกใน array
                    className="text-blue-600 hover:text-blue-800"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}