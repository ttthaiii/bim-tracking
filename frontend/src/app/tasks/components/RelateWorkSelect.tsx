import { useState, useEffect } from 'react';
import Select, { SelectOption } from '@/components/ui/Select';
import { useCache } from '@/context/CacheContext';
import { getCachedRelateWorks } from '@/services/cachedFirestoreService';

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
  const { getCache, setCache } = useCache();
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
        const data = await getCachedRelateWorks(activityId, getCache, setCache);
        setRelateWorks(data);
      } catch (error) {
        console.error('Error loading relate works:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelateWorks();
  }, [activityId, getCache, setCache]);

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