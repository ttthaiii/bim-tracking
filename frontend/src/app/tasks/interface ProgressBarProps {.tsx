interface ProgressBarProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function ProgressBar({ value, size = 'md' }: ProgressBarProps) {
  const height = size === 'sm' ? 'h-2' : size === 'md' ? 'h-4' : 'h-6';
  
  return (
    <div className={`w-full bg-gray-200 rounded-full ${height} relative`}>
      <div 
        className={`bg-green-500 rounded-full ${height} transition-all duration-300`}
        style={{ width: `${value}%` }}
      >
        <span className="absolute inset-0 text-[10px] text-white flex items-center justify-center font-medium">
          {value}%
        </span>
      </div>
    </div>
  );
}