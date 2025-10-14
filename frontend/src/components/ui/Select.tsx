import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean | 0 | 1 | "" | null | undefined;
  loading?: boolean;
  className?: string;
}

function Select({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  loading = false,
  className = ''
}: SelectProps) {
  // 🆕 เพิ่ม guard เพื่อป้องกัน double call
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    if (newValue !== value) {  // ⬅️ เช็คก่อนเรียก onChange
      onChange(newValue);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={Boolean(disabled || loading)}
        value={value || ''}
        onChange={handleChange}  // ⬅️ ใช้ handleChange แทน
        disabled={disabled || loading}
        className={`
          px-3 py-2 
          bg-white border border-gray-300 rounded-md 
          text-sm ${value ? 'text-gray-900' : 'text-gray-500'}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
          appearance-none
          w-full
          ${className}
        `}
      >
        <option value="">{loading ? 'Loading...' : placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}

// 🆕 ใช้ React.memo เพื่อป้องกัน unnecessary re-render
export default React.memo(Select, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.loading === nextProps.loading &&
    prevProps.options.length === nextProps.options.length
  );
});