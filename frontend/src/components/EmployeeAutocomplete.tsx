'use client';

import React from 'react';
import Select, { OnChangeValue, StylesConfig } from 'react-select';

type EmployeeOption = {
  value: string;
  label: string;
};

interface EmployeeAutocompleteProps {
  value: string;
  options: EmployeeOption[];
  onChange: (employeeId: string) => void;
  placeholder?: string;
  isDisabled?: boolean;
}

const styles: StylesConfig<EmployeeOption, false> = {
  control: (provided, state) => ({
    ...provided,
    minHeight: '36px',
    borderRadius: '0.375rem',
    borderColor: state.isFocused ? '#2563eb' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px #2563eb' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#2563eb' : '#9ca3af',
    },
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '0 10px',
  }),
  input: (provided) => ({
    ...provided,
    margin: 0,
    padding: 0,
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (provided) => ({
    ...provided,
    padding: '4px',
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#2563eb' : state.isFocused ? '#e0f2fe' : 'white',
    color: state.isSelected ? 'white' : '#1f2937',
    fontSize: '13px',
  }),
  placeholder: (provided) => ({
    ...provided,
    fontSize: '13px',
    color: '#9ca3af',
  }),
  singleValue: (provided) => ({
    ...provided,
    fontSize: '13px',
    color: '#1f2937',
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 50,
  }),
};

export const EmployeeAutocomplete: React.FC<EmployeeAutocompleteProps> = ({
  value,
  options,
  onChange,
  placeholder = 'ค้นหาพนักงาน...',
  isDisabled,
}) => {
  const currentValue = options.find(opt => opt.value === value) || null;

  const handleChange = (selected: OnChangeValue<EmployeeOption, false>) => {
    onChange(selected ? selected.value : '');
  };

  return (
    <Select<EmployeeOption, false>
      instanceId="employee-autocomplete"
      options={options}
      value={currentValue}
      onChange={handleChange}
      styles={styles}
      isClearable
      isSearchable
      placeholder={placeholder}
      isDisabled={isDisabled}
      noOptionsMessage={() => 'ไม่พบพนักงาน'}
    />
  );
};

export type { EmployeeOption };
