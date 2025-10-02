import React from 'react';

interface BadgeProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  showFullName?: boolean;
  className?: string;
}

export default function Badge({
  name,
  size = 'md',
  color = 'blue',
  showFullName = true,
  className = ''
}: BadgeProps) {
  const initials = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
  
  const sizeStyles = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base'
  };
  
  const colorStyles = {
    blue: 'bg-blue-600 text-white',
    green: 'bg-green-600 text-white',
    red: 'bg-red-600 text-white',
    yellow: 'bg-yellow-600 text-white',
    purple: 'bg-purple-600 text-white',
    gray: 'bg-gray-600 text-white'
  };
  
  return (
    <div className={`flex items-center ${className}`}>
      <div
        className={`
          ${sizeStyles[size]}
          ${colorStyles[color as keyof typeof colorStyles] || colorStyles.blue}
          rounded-full flex items-center justify-center font-medium shadow-sm
        `}
      >
        {initials}
      </div>
      {showFullName && (
        <span className="ml-2 text-sm font-medium text-gray-900">{name}</span>
      )}
    </div>
  );
}