import { useState, useEffect } from 'react';
import Select, { SelectOption } from '@/components/ui/Select';
import { getUsers } from '@/lib/users';

interface AssigneeSelectProps {
  projectName?: string; // ✅ เพิ่ม prop นี้เพื่อรับชื่อโปรเจกต์
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function AssigneeSelect({
  projectName,
  value,
  onChange,
  disabled = false,
  className = ''
}: AssigneeSelectProps) {
  const [users, setUsers] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const userList = await getUsers();
        let options = userList
          .filter(u => u.fullName && u.fullName.trim() !== '')
          .map((u, index) => ({
            value: u.fullName,
            label: u.fullName,
            key: u.id || `user-${index}`
          }));
        
        // ✅ ถ้าโปรเจกต์เป็น "Bim room" ให้เพิ่มตัวเลือก "all"
        if (projectName === 'Bim room') {
          options = [
            { value: 'all', label: 'all', key: 'all' },
            ...options
          ];
        }
        
        console.log('👥 Users loaded:', options);
        setUsers(options);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [projectName]); // ✅ เพิ่ม projectName ใน dependencies

  return (
    <Select
      options={users}
      value={value}
      onChange={onChange}
      placeholder="Select Assignee"
      disabled={disabled}
      loading={loading}
      className={className}
    />
  );
}