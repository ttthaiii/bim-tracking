'use client';

import { DailyReportEntry, Project } from '@/types/database';
import { useState } from 'react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupedLogs: Record<string, DailyReportEntry[]>;
  allProjects: Project[];
}

const formatTimestampToDateTime = (timestampMillis: string) => {
  if (timestampMillis === 'no-timestamp') return 'ยังไม่มี Timestamp (ข้อมูลเก่า)';
  const date = new Date(parseInt(timestampMillis));
  return date.toLocaleString('th-TH', {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
};

const generateRelateDrawingText = (entry: DailyReportEntry, projects: Project[]): string => {
  if (!entry.subtaskId) return '';
  const project = projects.find(p => p.id === entry.project);
  const parts = []; // <--- แก้ไข: เปลี่ยนจาก let เป็น const
  if (project) parts.push(project.abbr);
  if (entry.taskName) parts.push(entry.taskName);
  if (entry.subTaskName) parts.push(entry.subTaskName);
  if (entry.item) parts.push(entry.item);
  return parts.length > 0 ? `(${parts.join(' - ')})` : '';
};

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, groupedLogs, allProjects }) => {
  // --- แก้ไข: ย้าย Hook มาไว้บนสุด ก่อนเงื่อนไข ---
  const [expandedTimestamps, setExpandedTimestamps] = useState<Set<string>>(new Set());

  if (!isOpen) return null; // <--- เงื่อนไขยังอยู่เหมือนเดิม

  const toggleExpand = (timestamp: string) => {
    setExpandedTimestamps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(timestamp)) {
        newSet.delete(timestamp);
      } else {
        newSet.add(timestamp);
      }
      return newSet;
    });
  };

  const sortedTimestamps = Object.keys(groupedLogs).sort((a, b) => parseInt(b) - parseInt(a)); // Newest first

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-gray-800">ประวัติการลงข้อมูลรายวัน</h2>
        
        <div className="flex-1 overflow-y-auto pr-2">
          {sortedTimestamps.length === 0 ? (
            <p className="text-gray-600">ไม่มีประวัติการลงข้อมูลสำหรับวันนี้</p>
          ) : (
            sortedTimestamps.map((timestampKey) => (
              <div key={timestampKey} className="mb-4 border border-gray-200 rounded-md shadow-sm">
                <button
                  onClick={() => toggleExpand(timestampKey)}
                  className="flex justify-between items-center w-full p-3 text-left font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-t-md focus:outline-none"
                >
                  <span>อัปเดตเมื่อ: {formatTimestampToDateTime(timestampKey)}</span>
                  <svg
                    className={`w-4 h-4 transform transition-transform ${expandedTimestamps.has(timestampKey) ? 'rotate-180' : 'rotate-0'}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                {expandedTimestamps.has(timestampKey) && (
                  <div className="p-3 bg-white">
                    <table className="w-full text-sm text-left text-gray-700 mt-2">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                          <th scope="col" className="px-4 py-2">Relate Drawing</th>
                          <th scope="col" className="px-4 py-2 text-center">ชั่วโมงทำงาน</th>
                          <th scope="col" className="px-4 py-2 text-center">OT</th>
                          <th scope="col" className="px-4 py-2 text-center">Progress</th>
                          <th scope="col" className="px-4 py-2">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedLogs[timestampKey].map((logEntry) => (
                          <tr key={logEntry.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium">{generateRelateDrawingText(logEntry, allProjects)}</td>
                            <td className="px-4 py-2 text-center">{logEntry.normalWorkingHours}</td>
                            <td className="px-4 py-2 text-center">{logEntry.otWorkingHours}</td>
                            <td className="px-4 py-2 text-center font-semibold">{logEntry.progress}</td>
                            <td className="px-4 py-2">{logEntry.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-600"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};