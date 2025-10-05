import React from 'react';

interface ConfirmationPopupProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationPopup: React.FC<ConfirmationPopupProps> = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-orange-100">
        <div className="text-center mb-8">
          <div className="text-xl font-semibold mb-6 text-gray-800 leading-relaxed">{message}</div>
          <div className="flex justify-center space-x-4">
            <button
              onClick={onCancel}
              className="px-8 py-3 bg-white border-2 border-orange-300 text-orange-700 rounded-xl hover:bg-orange-50 font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              ไม่ต้องการ
            </button>
            <button
              onClick={onConfirm}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              ต้องการ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};