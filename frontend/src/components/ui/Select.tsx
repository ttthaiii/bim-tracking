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
  selectClassName?: string;
}

function Select({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  loading = false,
  className = '',
  selectClassName = ''
}: SelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    if (newValue !== value) {
      onChange(newValue);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <select
        value={value || ''}
        onChange={handleChange}
        // --- แก้ไข: แปลงค่าให้เป็น boolean เสมอ ---
        disabled={Boolean(disabled || loading)}
        className={`
          pl-2 pr-5 py-2 
          bg-white border border-gray-300 rounded-md 
          text-sm ${value ? 'text-gray-900' : 'text-gray-500'}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
          appearance-none
          w-full
        ${selectClassName}
        `}
      >
        <option value="">{loading ? 'Loading...' : placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      <div className="absolute inset-y-0 right-1 flex items-center px-1 pointer-events-none">
        <svg
          className="w-3.5 h-3.5 text-gray-300 opacity-60"
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

export default React.memo(Select, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.loading === nextProps.loading &&
    prevProps.options.length === nextProps.options.length &&
    prevProps.selectClassName === nextProps.selectClassName
  );
});
