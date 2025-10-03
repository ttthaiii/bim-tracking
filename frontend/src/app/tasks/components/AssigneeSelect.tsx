import { useState, useEffect } from 'react';
import Select, { SelectOption } from '@/components/ui/Select';
import { getUsers } from '@/lib/users';

interface AssigneeSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function AssigneeSelect({
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
        const options = userList
          .filter(u => u.fullName && u.fullName.trim() !== '')  // เปลี่ยนจาก FullName
          .map((u, index) => ({
            value: u.fullName,  // เปลี่ยนจาก FullName
            label: u.fullName,  // เปลี่ยนจาก FullName
            key: u.id || `user-${index}`
          }));
        
        console.log('👥 Users loaded:', options);
        setUsers(options);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

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