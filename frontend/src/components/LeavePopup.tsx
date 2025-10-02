import React from 'react';

interface LeavePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (leaveData: {
    leaveType: string;
    startDate: string;
    endDate: string;
    leaveHours: string;
    reason: string;
  }) => void;
}

export const LeavePopup: React.FC<LeavePopupProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [leaveData, setLeaveData] = React.useState({
    leaveType: 'ลาป่วย',
    startDate: '',
    endDate: '',
    leaveHours: '00:00',
    reason: '',
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[500px]">
        <h2 className="text-xl font-semibold mb-6 text-center bg-red-50 py-2 rounded">ข้อมูลการลา</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Leave Type (การลา)</label>
            <select
              value={leaveData.leaveType}
              onChange={(e) => setLeaveData({ ...leaveData, leaveType: e.target.value })}
              className="w-full p-2 border rounded-md"
            >
              <option value="ลาป่วย">ลาป่วย</option>
              <option value="ลากิจ">ลากิจ</option>
              <option value="ลาพักร้อน">ลาพักร้อน</option>
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Start date</label>
              <div className="relative">
                <input
                  type="date"
                  value={leaveData.startDate}
                  onChange={(e) => setLeaveData({ ...leaveData, startDate: e.target.value })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">End date</label>
              <div className="relative">
                <input
                  type="date"
                  value={leaveData.endDate}
                  onChange={(e) => setLeaveData({ ...leaveData, endDate: e.target.value })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Leave (hrs) (ชั่วโมงการลา)</label>
            <input
              type="time"
              value={leaveData.leaveHours}
              onChange={(e) => setLeaveData({ ...leaveData, leaveHours: e.target.value })}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reason (เหตุผลการลา)</label>
            <textarea
              value={leaveData.reason}
              onChange={(e) => setLeaveData({ ...leaveData, reason: e.target.value })}
              className="w-full p-2 border rounded-md h-24 resize-none"
              placeholder="กรุณาระบุเหตุผลการลา"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={() => onSubmit(leaveData)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
};