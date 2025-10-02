import { useState, useEffect } from 'react';
import Select, { SelectOption } from '@/components/ui/Select';
import { getActivities } from '@/lib/relateWorks';

interface ActivitySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function ActivitySelect({
  value,
  onChange,
  disabled = false,
  className = ''
}: ActivitySelectProps) {
  const [activities, setActivities] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const data = await getActivities();
        setActivities(data);
      } catch (error) {
        console.error('Error loading activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  return (
    <Select
      options={activities}
      value={value}
      onChange={onChange}
      placeholder="Select Activity"
      disabled={disabled}
      loading={loading}
      className={className}
    />
  );
}