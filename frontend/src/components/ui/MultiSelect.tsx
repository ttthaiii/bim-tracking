import React, { useState, useRef, useEffect } from 'react';

export interface MultiSelectOption {
    value: string;
    label: string;
}

interface MultiSelectProps {
    options: MultiSelectOption[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function MultiSelect({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    disabled = false,
    className = '',
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleToggle = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    const handleCheckboxChange = (optionValue: string) => {
        if (optionValue === 'All') {
            // If "All" is selected/deselected, handle logic
            // If "All" was already selected, we are deselecting it -> clear all
            // If "All" was not selected, we are selecting it -> select only "All" (exclusive) or select everything?
            // Usually in this app logic: ['All'] means everything.
            if (value.includes('All')) {
                onChange([]);
            } else {
                onChange(['All']);
            }
            return;
        }

        // If we click a specific option
        let newValue: string[];

        // If "All" is in the list, remove it first, then toggle the clicked one.
        const cleanValue = value.filter(v => v !== 'All');

        if (cleanValue.includes(optionValue)) {
            newValue = cleanValue.filter(v => v !== optionValue);
        } else {
            newValue = [...cleanValue, optionValue];
        }

        // If nothing selected, you can decide to stick to empty or revert to All. 
        // Here we return empty array. The parent component should handle empty as "no filter" or "show nothing".
        // Wait, usually empty filter means "show all" or "show none"? 
        // In this app context, 'All' is explicit. If empty, maybe show nothing? 
        // Let's stick to simple state update here. Logic is in parent.
        onChange(newValue);
    };

    // Logic to display text
    const getDisplayLabel = () => {
        if (value.includes('All')) return 'ทั้งหมด (All)';
        if (value.length === 0) return placeholder;

        // Find labels
        const selectedLabels = value.map(v => options.find(o => o.value === v)?.label || v);

        if (selectedLabels.length <= 2) {
            return selectedLabels.join(', ');
        }
        return `${selectedLabels.length} selected`;
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={handleToggle}
                disabled={disabled}
                className={`
          flex items-center justify-between w-full
          pl-2 pr-2 py-2 
          bg-white border border-gray-300 rounded-md 
          text-sm ${value.length > 0 || value.includes('All') ? 'text-gray-900' : 'text-gray-500'}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
        `}
            >
                <span className="truncate">{getDisplayLabel()}</span>
                <svg
                    className="w-4 h-4 ml-2 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {options.map((option) => {
                        const isSelected = value.includes(option.value);
                        return (
                            <label
                                key={option.value}
                                className="flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100"
                            >
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    checked={isSelected}
                                    onChange={() => handleCheckboxChange(option.value)}
                                />
                                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
