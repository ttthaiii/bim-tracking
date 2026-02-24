import React from 'react';

interface ProgressBarProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function ProgressBar({ value, size = 'md' }: ProgressBarProps) {
  const height = size === 'sm' ? 'h-2' : size === 'md' ? 'h-4' : 'h-6';

  const barColorClass = value === 100 ? 'bg-green-500' : 'bg-yellow-500'; // Standard yellow for < 100%

  return (
    <div className={`w-full bg-gray-200 rounded-full ${height} relative`}>
      <div
        className={`${barColorClass} rounded-full ${height} transition-all duration-300`}
        style={{ width: `${value}%` }}
      >
        <span className="absolute inset-0 text-[10px] text-white flex items-center justify-center font-medium">
          {value}%
        </span>
      </div>
    </div>
  );
}