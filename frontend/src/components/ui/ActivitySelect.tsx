import React from 'react';

interface ActivitySelectProps {
  value: string;
  onChange: (id: string, field: string, value: string) => void;
  rowId: string;
  disabled?: boolean;
}

export default function ActivitySelect({ value, onChange, rowId, disabled }: ActivitySelectProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    setIsLoading(true);

    try {
      onChange(rowId, 'activity', selectedValue);
    } catch (error) {
      console.error('Error updating activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={handleChange}
        disabled={disabled || isLoading}
        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
      >
        <option value="">Select Activity</option>
        <option value="Architectural">Architectural</option>
        <option value="Structural">Structural</option>
        <option value="MEP">MEP</option>
      </select>
      {isLoading && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      )}
    </div>
  );
}