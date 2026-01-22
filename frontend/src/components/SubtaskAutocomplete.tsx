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
  selectedSubtaskIds: Set<string>; // เพิ่ม prop สำหรับเก็บ ID ของ subtask ที่ถูกเลือกแล้ว
  onChange: (entryId: string, subtaskId: string | null) => void;
  onFocus: (entryId: string) => void;
  isDisabled?: boolean;
}

const formatSubtaskDisplay = (subtask: Subtask, projects: Project[]): string => {
  // Comprehensive project lookup logic
  const projectObj = projects.find(p => p.id === subtask.projectId) ||
    projects.find(p => p.id === subtask.project) ||
    projects.find(p => p.name === subtask.project);

  let projectDisplay = 'N/A';
  if (projectObj) {
    projectDisplay = projectObj.abbr || projectObj.name;
  } else if (subtask.projectId) {
    projectDisplay = subtask.projectId;
  } else if (subtask.project) {
    projectDisplay = subtask.project;
  }

  const taskName = subtask.taskName || 'N/A';
  const subTaskName = subtask.subTaskName || 'N/A';
  const item = subtask.item || '';
  const internalRev = subtask.internalRev ? ` (Rev.${subtask.internalRev})` : '';

  // Fix: Show item only if it's not empty and not "N/A"
  const showItem = item && item !== 'N/A';

  // [T-028] Normalize subtask ID to uppercase for display
  const subtaskIdDisplay = (subtask.id || '').toUpperCase();

  return showItem ?
    `${projectDisplay} - ${taskName} - ${subTaskName} - ${item}${internalRev} (${subtaskIdDisplay})` :
    `${projectDisplay} - ${taskName} - ${subTaskName}${internalRev} (${subtaskIdDisplay})`;
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
  selectedSubtaskIds = new Set(), // กำหนดค่าเริ่มต้นเป็น empty Set
  onChange,
  onFocus,
  isDisabled
}) => {

  const subtaskOptions: SubtaskOption[] = options
    .filter(subtask => {
      // ใช้ path เป็น unique identifier เนื่องจาก Subtask ใช้ path เป็น id
      return !selectedSubtaskIds.has(subtask.path || '') || subtask.path === value;
    })
    .map(subtask => ({
      value: subtask.path || '',
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
