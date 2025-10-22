'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DailyReportEntry } from '@/types/database';
import { uploadFileForDailyReport } from '@/services/uploadService';
import { useAuth } from '@/context/AuthContext';

export interface SelectedFileInfo {
  fileName: string;
  fileURL: string;
  storagePath: string;
  fileUploadedAt?: string;
}

export type SelectedFileMap = Record<string, SelectedFileInfo>;

interface UploadPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (files: SelectedFileMap) => void;
  completedTasks: DailyReportEntry[]; // Tasks ที่มี Progress 100%
}

interface UploadStatus {
  [taskId: string]: {
    file: File | null;
    uploading: boolean;
    uploaded: boolean;
    skipped: boolean;
    error: string | null;
    existingFileName: string | null;
    existingFileURL: string | null;
    existingStoragePath: string | null;
    existingFileUploadedAt: string | null;
  };
}

export const UploadPopup: React.FC<UploadPopupProps> = ({
  isOpen,
  onClose,
  onComplete,
  completedTasks
}) => {
  const { appUser } = useAuth();
  const buildInitialStatus = useCallback((): UploadStatus => {
    const initialStatus: UploadStatus = {};
    completedTasks.forEach(task => {
      const uploadedAtISO = task.fileUploadedAt
        ? (typeof (task.fileUploadedAt as any)?.toDate === 'function'
            ? (task.fileUploadedAt as any).toDate().toISOString()
            : (task.fileUploadedAt as unknown as Date).toISOString?.() || null)
        : null;
      initialStatus[task.id] = {
        file: null,
        uploading: false,
        uploaded: Boolean(task.fileURL),
        skipped: Boolean(task.fileURL),
        error: null,
        existingFileName: task.fileName || null,
        existingFileURL: task.fileURL || null,
        existingStoragePath: task.storagePath || null,
        existingFileUploadedAt: uploadedAtISO,
      };
    });
    return initialStatus;
  }, [completedTasks]);

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(() => buildInitialStatus());

  useEffect(() => {
    if (isOpen) {
      setUploadStatus(buildInitialStatus());
      setIsAllUploading(false);
    }
  }, [isOpen, buildInitialStatus]);

  useEffect(() => {
    setUploadStatus(prev => {
      const merged: UploadStatus = {};
      completedTasks.forEach(task => {
        const existing = prev[task.id];
        merged[task.id] = existing
          ? {
              ...existing,
              existingFileName: existing.existingFileName || task.fileName || null,
              existingFileURL: existing.existingFileURL || task.fileURL || null,
              existingStoragePath: existing.existingStoragePath || task.storagePath || null,
              existingFileUploadedAt: existing.existingFileUploadedAt || (task.fileUploadedAt
                ? (typeof (task.fileUploadedAt as any)?.toDate === 'function'
                    ? (task.fileUploadedAt as any).toDate().toISOString()
                    : (task.fileUploadedAt as unknown as Date).toISOString?.() || null)
                : null),
              uploaded: existing.uploaded || Boolean(task.fileURL),
              skipped: existing.skipped || Boolean(task.fileURL && !existing.file),
            }
          : {
              file: null,
              uploading: false,
              uploaded: Boolean(task.fileURL),
              skipped: Boolean(task.fileURL),
              error: null,
              existingFileName: task.fileName || null,
              existingFileURL: task.fileURL || null,
              existingStoragePath: task.storagePath || null,
              existingFileUploadedAt: task.fileUploadedAt
                ? (typeof (task.fileUploadedAt as any)?.toDate === 'function'
                    ? (task.fileUploadedAt as any).toDate().toISOString()
                    : (task.fileUploadedAt as unknown as Date).toISOString?.() || null)
                : null,
            };
      });
      return merged;
    });
  }, [completedTasks]);

  const [isAllUploading, setIsAllUploading] = useState(false);

  const handleFileSelect = (taskId: string, file: File | null) => {
    setUploadStatus(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        file,
        skipped: false,
        uploaded: false,
        error: null
      }
    }));
  };

  const handleSkipToExisting = (task: DailyReportEntry) => {
    setUploadStatus(prev => ({
      ...prev,
      [task.id]: {
        ...prev[task.id],
        file: null,
        uploading: false,
        uploaded: true,
        skipped: true,
        error: null,
        existingFileName: prev[task.id]?.existingFileName || task.fileName || null,
        existingFileURL: prev[task.id]?.existingFileURL || task.fileURL || null,
        existingStoragePath: prev[task.id]?.existingStoragePath || task.storagePath || null,
        existingFileUploadedAt: prev[task.id]?.existingFileUploadedAt
          || (task.fileUploadedAt
                ? (typeof (task.fileUploadedAt as any)?.toDate === 'function'
                    ? (task.fileUploadedAt as any).toDate().toISOString()
                    : (task.fileUploadedAt as unknown as Date).toISOString?.() || null)
                : null),
      }
    }));
  };

  const handleSingleUpload = async (task: DailyReportEntry) => {
    const status = uploadStatus[task.id];
    if (!status.file) {
      // If no new file but task already has existing file, treat as skip
      if (status.existingFileURL || task.fileURL) {
        handleSkipToExisting(task);
      } else {
        setUploadStatus(prev => ({
          ...prev,
          [task.id]: {
            ...prev[task.id],
            error: 'กรุณาเลือกไฟล์ก่อนอัปโหลด',
          }
        }));
      }
      return;
    }

    setUploadStatus(prev => ({
      ...prev,
      [task.id]: {
        ...prev[task.id],
        uploading: true,
        error: null
      }
    }));

    try {
      if (!appUser?.employeeId) {
        throw new Error('ไม่พบข้อมูลผู้ใช้');
      }

      const { cdnURL, storagePath, fileUploadedAt } = await uploadFileForDailyReport(
        status.file,
        appUser.employeeId,
        task.subtaskId,
        task.assignDate,
        task.subtaskPath || ''
      );
      
      setUploadStatus(prev => ({
        ...prev,
        [task.id]: {
        ...prev[task.id],
        uploading: false,
        uploaded: true,
        skipped: false,
        error: null,
        existingFileName: status.file?.name || prev[task.id]?.existingFileName || null,
        existingFileURL: cdnURL,
        existingStoragePath: storagePath,
        existingFileUploadedAt: fileUploadedAt.toDate().toISOString(),
        file: null,
        }
      }));
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(prev => ({
        ...prev,
        [task.id]: {
          ...prev[task.id],
          uploading: false,
          error: 'การอัปโหลดล้มเหลว'
        }
      }));
    }
  };

  const handleUploadAll = async () => {
    setIsAllUploading(true);
    
    const tasksWithFiles = completedTasks.filter(task => 
      uploadStatus[task.id]?.file && !uploadStatus[task.id]?.skipped
    );

    for (const task of tasksWithFiles) {
      if (!uploadStatus[task.id].uploaded) {
        await handleSingleUpload(task);
      }
    }

    setIsAllUploading(false);
  };

  const hasFilesToUpload = useMemo(() => completedTasks.some(task => {
    const status = uploadStatus[task.id];
    if (!status) return true;

    const hasExistingFile = Boolean(status.existingFileURL || task.fileURL);

    if (status.file) {
      return !status.uploaded;
    }

    if (status.skipped || status.uploaded) {
      return false;
    }

    return !hasExistingFile;
  }), [completedTasks, uploadStatus]);

  const buildSelectedFileMap = useCallback((): SelectedFileMap => {
    const map: SelectedFileMap = {};
    completedTasks.forEach(task => {
      const status = uploadStatus[task.id];
      if (!status) return;

      const fileURL = status.existingFileURL || task.fileURL;
      if (!fileURL) return;

      map[task.id] = {
        fileName: status.existingFileName || task.fileName || '',
        fileURL,
        storagePath: status.existingStoragePath || task.storagePath || '',
        fileUploadedAt: status.existingFileUploadedAt || (task.fileUploadedAt
          ? (typeof (task.fileUploadedAt as any)?.toDate === 'function'
              ? (task.fileUploadedAt as any).toDate().toISOString()
              : (task.fileUploadedAt as unknown as Date).toISOString?.() || undefined)
          : undefined),
      };
    });
    return map;
  }, [completedTasks, uploadStatus]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 shadow-2xl border border-green-100" style={{ minWidth: '70vw', maxHeight: '90vh' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-800">
            Upload Files for Completed Tasks
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse rounded-xl overflow-hidden shadow-lg">
            <thead>
              <tr className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
                <th className="border border-green-300 p-4 w-16 text-lg font-semibold first:rounded-tl-xl">No</th>
                <th className="border border-green-300 p-4 w-1/3 text-lg font-semibold">Relate Drawing</th>
                <th className="border border-green-300 p-4 w-32 text-lg font-semibold">Progress</th>
                <th className="border border-green-300 p-4 w-48 text-lg font-semibold">Select File</th>
                <th className="border border-green-300 p-4 w-32 text-lg font-semibold">Status</th>
                <th className="border border-green-300 p-4 w-32 text-lg font-semibold last:rounded-tr-xl">Action</th>
              </tr>
            </thead>
            <tbody>
              {completedTasks.map((task, index) => {
                const status = uploadStatus[task.id];
                return (
                  <tr key={task.id} className="hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200">
                    <td className="border border-green-200 p-4 text-center text-lg text-gray-900">
                      {index + 1}
                    </td>
                    <td className="border border-green-200 p-4 text-lg text-gray-900">
                      {task.relateDrawing}
                    </td>
                    <td className="border border-green-200 p-4 text-center">
                      <div className="bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border border-emerald-300 rounded-full py-2 px-3 text-lg font-medium shadow-sm">
                        {task.progress}
                      </div>
                    </td>
                    <td className="border border-green-200 p-4">
                      <input
                        type="file"
                        onChange={(e) => handleFileSelect(task.id, e.target.files?.[0] || null)}
                        className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:border-green-500"
                        disabled={status?.uploading}
                      />
                      {status?.file && (
                        <div className="mt-1 text-xs text-gray-600">
                          {status.file.name} ({(status.file.size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                      )}
                      {!status?.file && (status?.existingFileURL || task.fileURL) && (
                        <div className="mt-1 text-xs text-green-700 flex items-center gap-2">
                          <span>ไฟล์ปัจจุบัน:</span>
                          <a
                            href={status?.existingFileURL || task.fileURL || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800 underline"
                          >
                            {status?.existingFileName || task.fileName || 'เปิดไฟล์'}
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="border border-green-200 p-4 text-center">
                      {status?.uploading && (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                          <span className="ml-2 text-sm text-green-600">กำลังอัปโหลด...</span>
                        </div>
                      )}
                      {status?.skipped && (status?.existingFileURL || task.fileURL) && !status?.uploading && (
                        <div className="text-green-600 font-semibold text-sm">
                          ✓ ใช้ไฟล์เดิม
                        </div>
                      )}
                      {status?.uploaded && !status?.skipped && (
                        <div className="text-green-600 font-semibold text-sm">
                          ✓ อัปโหลดสำเร็จ
                        </div>
                      )}
                      {status?.error && (
                        <div className="text-red-600 font-semibold text-sm">
                          ✗ {status.error}
                        </div>
                      )}
                      {!status?.uploading && !status?.uploaded && !status?.error && !status?.skipped && (
                        <div className="text-gray-500 text-sm">
                          รอการอัปโหลด
                        </div>
                      )}
                    </td>
                    <td className="border border-green-200 p-4 text-center">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleSingleUpload(task)}
                          disabled={status?.uploading || (!status?.file && status?.uploaded)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            status?.uploading || (!status?.file && status?.uploaded)
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transform hover:scale-105'
                          }`}
                        >
                          {status?.uploading ? 'กำลังอัปโหลด...' : status?.uploaded && !status?.file ? 'อัปโหลดแล้ว' : 'อัปโหลด'}
                        </button>
                        {(status?.existingFileURL || task.fileURL) && (
                          <button
                            onClick={() => handleSkipToExisting(task)}
                            disabled={status?.uploading}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                              status?.uploading
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-white border border-green-400 text-green-600 hover:bg-green-50 shadow-sm'
                            }`}
                          >
                            ใช้ไฟล์เดิม
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {completedTasks.length} งานที่เสร็จสมบูรณ์ (Progress 100%)
          </div>
          
          <div className="flex space-x-4">
            {hasFilesToUpload && (
              <button
                onClick={handleUploadAll}
                disabled={isAllUploading}
                className={`px-6 py-3 rounded-xl text-lg font-medium shadow-lg transition-all duration-200 transform hover:scale-105 ${
                  isAllUploading
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-xl'
                }`}
              >
                {isAllUploading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    กำลังอัปโหลดทั้งหมด...
                  </div>
                ) : (
                  'อัปโหลดทั้งหมด'
                )}
              </button>
            )}
            
            <button
              onClick={() => onComplete(buildSelectedFileMap())}
              disabled={hasFilesToUpload}
              className={`px-8 py-3 rounded-xl text-lg font-medium shadow-lg transition-all duration-200 transform hover:scale-105 ${
                hasFilesToUpload
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:shadow-xl'
              }`}
            >
              เสร็จสิ้น
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
