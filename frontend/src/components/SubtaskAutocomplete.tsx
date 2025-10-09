'use client';

import React from 'react';
import Select, { OnChangeValue, StylesConfig } from 'react-select';
import { Subtask } from '@/types/database'; // Assuming this is your Subtask type
import { Project } from '@/lib/projects'; // Assuming this is your Project type

interface SubtaskOption {
  value: string;
  label: string;
  subtask: Subtask;
}

interface SubtaskAutocompleteProps {
  entryId: string;
  value: string | null;
  options: Subtask[];
  allProjects: Project[];
  onChange: (entryId: string, subtaskId: string | null) => void;
  onFocus: (entryId: string) => void;
  isDisabled?: boolean;
}

const formatSubtaskDisplay = (subtask: Subtask, projects: Project[]): string => {
  // Comprehensive project lookup logic
  const projectObj = projects.find(p => p.id === subtask.projectId) || 
                     projects.find(p => p.id === subtask.project) ||
                     projects.find(p => p.name === subtask.project);

  const abbr = projectObj ? projectObj.abbr : subtask.project || 'N/A';
  const taskName = subtask.taskName || 'N/A';
  const subTaskName = subtask.subTaskName || 'N/A';
  const item = subtask.item || 'N/A';
  return `(${abbr} - ${taskName} - ${subTaskName} - ${item})`;
};

// Custom styles for react-select to match the UI
const customStyles: StylesConfig<SubtaskOption, false> = {
  control: (provided, state) => ({
    ...provided,
    minHeight: '30px',
    height: '30px',
    border: '1px solid #d1d5db', // gray-300
    borderRadius: '0.375rem', // rounded-md
    backgroundColor: 'white',
    boxShadow: state.isFocused ? '0 0 0 1px #f97316' : 'none', // orange-500 focus ring
    borderColor: state.isFocused ? '#f97316' : '#d1d5db',
    '&:hover': {
      borderColor: state.isFocused ? '#f97316' : '#a5b4fc',
    },
  }),
  valueContainer: (provided) => ({
    ...provided,
    height: '30px',
    padding: '0 8px',
  }),
  input: (provided) => ({
    ...provided,
    margin: '0px',
    padding: '0px',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (provided) => ({
    ...provided,
    height: '30px',
    padding: '4px',
    color: '#6b7280', // gray-500
    '&:hover': {
        color: '#111827', // gray-900
    }
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#f97316' : state.isFocused ? '#fed7aa' : 'white',
    color: state.isSelected ? 'white' : '#1f2937',
    fontSize: '12px',
  }),
  placeholder: (provided) => ({
      ...provided,
      color: '#9ca3af', // gray-400
      fontSize: '12px',
  }),
  singleValue: (provided) => ({
      ...provided,
      color: '#1f2937', // gray-800
      fontSize: '12px',
  })
};

export const SubtaskAutocomplete: React.FC<SubtaskAutocompleteProps> = ({ 
    entryId, 
    value, 
    options, 
    allProjects, 
    onChange, 
    onFocus,
    isDisabled
}) => {

  const subtaskOptions: SubtaskOption[] = options.map(subtask => ({
    value: subtask.id,
    label: formatSubtaskDisplay(subtask, allProjects),
    subtask: subtask,
  }));

  const selectedValue = subtaskOptions.find(option => option.value === value) || null;

  const handleChange = (selectedOption: OnChangeValue<SubtaskOption, false>) => {
    onChange(entryId, selectedOption ? selectedOption.value : null);
  };

  return (
    <Select<SubtaskOption, false>
      instanceId={`subtask-select-${entryId}`}
      options={subtaskOptions}
      value={selectedValue}
      onChange={handleChange}
      onFocus={() => onFocus(entryId)}
      styles={customStyles}
      placeholder="พิมพ์เพื่อค้นหา Subtask..."
      isClearable
      isDisabled={isDisabled}
    />
  );
};
