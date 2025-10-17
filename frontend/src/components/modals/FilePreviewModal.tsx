import React, { useMemo, useState } from 'react';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    name: string;
    url: string;
  } | null;
}

const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'heic', 'heif'];

const getExtension = (filenameOrUrl: string): string => {
  const match = filenameOrUrl.match(/\.([a-zA-Z0-9]+)(?:$|\?)/);
  return match ? match[1].toLowerCase() : '';
};

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ isOpen, onClose, file }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const extension = useMemo(() => {
    if (!file) return '';
    return getExtension(file.name || file.url);
  }, [file]);

  if (!isOpen || !file) return null;

  const isImage = imageExtensions.includes(extension);
  const isPdf = extension === 'pdf';

  const handleDownload = async () => {
    if (!file) return;
    try {
      setDownloadError(null);
      setIsDownloading(true);
      const response = await fetch(file.url, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.name || 'download';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download file:', error);
      setDownloadError('ไม่สามารถดาวน์โหลดไฟล์ได้ กรุณาลองอีกครั้ง');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 truncate mr-4">
            {file.name || 'Preview'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            aria-label="Close preview"
          >
            ×
          </button>
        </div>

        <div className="flex-1 bg-gray-100 flex items-center justify-center p-0 overflow-hidden">
          {isImage && (
            <img
              src={file.url}
              alt={file.name}
              className="max-h-full max-w-full object-contain rounded-lg shadow-inner bg-white"
            />
          )}

          {isPdf && (
            <iframe
              src={`${file.url}#toolbar=1&navpanes=0&view=FitH`}
              title={file.name}
              className="w-full h-full bg-white"
              style={{ minHeight: '70vh' }}
            />
          )}

          {!isImage && !isPdf && (
            <div className="text-center text-gray-600">
              <p className="text-sm">ไม่สามารถแสดงตัวอย่างไฟล์ประเภทนี้ได้</p>
              <p className="text-xs mt-2">กรุณาดาวน์โหลดไฟล์เพื่อดูรายละเอียด</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-between items-center gap-4">
          <span className="text-sm text-gray-500">{file.name}</span>
          <div className="flex items-center gap-3">
            {downloadError && (
              <span className="text-xs text-red-500">{downloadError}</span>
            )}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className={`px-5 py-2 rounded-lg text-sm font-medium shadow-md transition-colors ${
                isDownloading
                  ? 'bg-blue-300 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isDownloading ? 'กำลังดาวน์โหลด...' : 'Download'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
