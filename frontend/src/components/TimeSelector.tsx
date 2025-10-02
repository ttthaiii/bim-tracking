import React from 'react';

interface TimeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  type: 'normal' | 'ot';
}

export const TimeSelector: React.FC<TimeSelectorProps> = ({ value, onChange, type }) => {
  const hours = Array.from({ length: 8 }, (_, i) => i + 1);
  const minutes = ['00', '15', '30', '45'];

  const [selectedHour, selectedMinute] = value ? value.split(':') : ['', ''];

  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <select
          value={selectedHour}
          onChange={(e) => {
            const hour = e.target.value;
            const minute = selectedMinute || '00';
            onChange(`${hour}:${minute}`);
          }}
          className="appearance-none border rounded px-2 py-1 pr-8 bg-white"
        >
          <option value="">ชั่วโมง</option>
          {hours.map((hour) => (
            <option key={hour} value={hour.toString().padStart(2, '0')}>
              {hour} ชั่วโมง
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <div className="relative">
        <select
          value={selectedMinute}
          onChange={(e) => {
            const minute = e.target.value;
            const hour = selectedHour || '00';
            onChange(`${hour}:${minute}`);
          }}
          className="appearance-none border rounded px-2 py-1 pr-8 bg-white"
        >
          <option value="">นาที</option>
          {minutes.map((minute) => (
            <option key={minute} value={minute}>
              {minute} นาที
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};