import React from 'react';

interface LoadingOverlayProps {
    isLoading: boolean;
    message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, message = 'กำลังโหลดข้อมูล...' }) => {
    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm transition-opacity duration-300">
            <div className="flex flex-col items-center bg-white p-6 rounded-lg shadow-xl border border-gray-100">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-200 border-t-orange-600 mb-4"></div>
                <div className="text-gray-700 font-medium text-sm animate-pulse">{message}</div>
            </div>
        </div>
    );
};

export default LoadingOverlay;
