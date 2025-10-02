import { useState, useEffect } from 'react';
import Select, { SelectOption } from '@/components/ui/Select';
import { getRelateWorksByActivity } from '@/lib/relateWorks';

interface RelateWorkSelectProps {
  activityId: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function RelateWorkSelect({
  activityId,
  value,
  onChange,
  disabled = false,
  className = ''
}: RelateWorkSelectProps) {
  const [relateWorks, setRelateWorks] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRelateWorks = async () => {
      if (!activityId) {
        setRelateWorks([]);
        return;
      }

      setLoading(true);
      try {
        const data = await getRelateWorksByActivity(activityId);
        setRelateWorks(data);
      } catch (error) {
        console.error('Error loading relate works:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelateWorks();
  }, [activityId]);

  return (
    <Select
      options={relateWorks}
      value={value}
      onChange={onChange}
      placeholder={activityId ? "Select Relate Work" : "Select Activity first"}
      disabled={disabled || !activityId}
      loading={loading}
      className={className}
    />
  );
}