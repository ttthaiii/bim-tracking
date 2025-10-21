'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface EmployeeDoc {
  employeeId?: string;
  fullName?: string;
  role?: string;
}

export interface EmployeeOptionItem {
  value: string;
  label: string;
  role: string;
}

export const useEmployeeOptions = (enabled: boolean) => {
  const [options, setOptions] = useState<EmployeeOptionItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const employees: EmployeeOptionItem[] = snapshot.docs
          .map(doc => doc.data() as EmployeeDoc)
          .filter(doc => doc.employeeId)
          .map(doc => ({
            value: doc.employeeId!,
            label: `${doc.employeeId}_${doc.fullName || ''}`.trim(),
            role: doc.role || '',
          }))
          .sort((a, b) => a.value.localeCompare(b.value));
        setOptions(employees);
      } catch (err) {
        console.error('Failed to load employees for autocomplete:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [enabled]);

  const valueMap = useMemo(() => {
    const map = new Map<string, EmployeeOptionItem>();
    options.forEach(option => map.set(option.value, option));
    return map;
  }, [options]);

  return { options, loading, valueMap };
};
