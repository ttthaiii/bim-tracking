import React from 'react';
import ReactSelect, { StylesConfig } from 'react-select';

export interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean | 0 | 1 | "" | null | undefined;
  loading?: boolean;
  className?: string;
}

const customStyles: StylesConfig<SelectOption, false> = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: state.isDisabled ? '#f3f4f6' : '#ffffff', // gray-100 or white
    borderColor: state.isFocused ? '#3b82f6' : '#d1d5db', // blue-500 or gray-300
    borderRadius: '0.375rem', // rounded-md
    boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none',
    minHeight: '36px',
    padding: '0 2px',
    fontSize: '0.875rem', // text-sm
    cursor: state.isDisabled ? 'not-allowed' : 'default',
    '&:hover': {
      borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
    }
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '0 4px',
  }),
  input: (provided) => ({
    ...provided,
    margin: '0px',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  indicatorsContainer: (provided) => ({
    ...provided,
    height: '36px',
  }),
  menu: (provided) => ({
    ...provided,
    fontSize: '0.875rem', // text-sm
    zIndex: 50,
  }),
  singleValue: (provided, state) => ({
    ...provided,
    color: state.isDisabled ? '#6b7280' : '#111827', // gray-500 or gray-900
  }),
};

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  loading = false,
  className = ''
}: SearchableSelectProps) {
  const selectedOption = options.find((opt) => opt.value === value) || null;

  const handleChange = (selected: SelectOption | null) => {
    if (selected) {
      onChange(selected.value);
    } else {
      onChange('');
    }
  };

  return (
    <div className={`relative ${className}`}>
      <ReactSelect
        value={selectedOption}
        onChange={handleChange}
        options={options}
        isDisabled={Boolean(disabled || loading)}
        isLoading={loading}
        placeholder={placeholder}
        styles={customStyles}
        isClearable={false}
        isSearchable={true}
        noOptionsMessage={() => "ไม่พบข้อมูล"}
      />
    </div>
  );
}

export default React.memo(SearchableSelect, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.loading === nextProps.loading &&
    prevProps.options.length === nextProps.options.length
  );
});
