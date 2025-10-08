import React from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  newCount: number;
  updateCount: number;
}

export default function SuccessModal({
  isOpen,
  onClose,
  newCount,
  updateCount
}: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all w-full max-w-md">
          <div className="bg-white px-6 py-8">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-center text-2xl font-bold text-gray-900 mb-4">
              บันทึกข้อมูลสำเร็จ
            </h2>

            {/* Details */}
            <div className="text-center text-gray-600 space-y-1">
              {newCount > 0 && (
                <p>บันทึกรายการใหม่สำเร็จ {newCount} รายการ</p>
              )}
              {updateCount > 0 && (
                <p>บันทึกรายการแก้ไขสำเร็จ {updateCount} รายการ</p>
              )}
            </div>

            {/* Button */}
            <div className="mt-8">
              <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                ดำเนินการต่อ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}