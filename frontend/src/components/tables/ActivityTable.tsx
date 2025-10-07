import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TableSortLabel,
  Chip
} from '@mui/material';
import { RecentActivity, getRecentActivities } from '@/services/dashboardService';
import { useDashboard } from '@/context/DashboardContext';

type Order = 'asc' | 'desc';

interface Column {
  id: keyof RecentActivity | 'runningNumber';
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
}

// Function to format date to dd/mmm/yyyy (พ.ศ.)
const formatThaiDate = (value: Date): string => {
  if (!(value instanceof Date) || isNaN(value.getTime())) {
    return 'N/A';
  }

  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  const day = value.getDate();
  const month = thaiMonths[value.getMonth()];
  const year = value.getFullYear() + 543;

  return `${day}/${month}/${year}`;
};

const columns: Column[] = [
  { id: 'runningNumber', label: 'ลำดับ', minWidth: 50, align: 'center' },
  {
    id: 'dueDate',
    label: 'กำหนดส่ง',
    minWidth: 100,
    format: formatThaiDate // Use the new formatting function
  },
  { id: 'projectName', label: 'โครงการ', minWidth: 130 },
  { id: 'documentNumber', label: 'เลขที่เอกสาร', minWidth: 150 },
  { id: 'revNo', label: 'Rev', minWidth: 50, align: 'center' }, // เพิ่มคอลัมน์ Rev เข้ามา
  { id: 'description', label: 'ชื่อเอกสาร', minWidth: 250 },
  { id: 'currentStep', label: 'ขั้นตอนปัจจุบัน', minWidth: 180 },
  {
    id: 'status',
    label: 'สถานะ',
    minWidth: 100,
    align: 'center'
  },
];

function getStatusColor(status: string): { color: string, backgroundColor: string } {
  switch (status) {
    case 'เสร็จสิ้น':
      return { color: '#065F46', backgroundColor: '#D1FAE5' }; // Green
    case 'รออนุมัติจาก CM':
      return { color: '#991B1B', backgroundColor: '#FEE2E2' }; // Red
    case 'รอตรวจสอบหน้างาน':
      return { color: '#B45309', backgroundColor: '#FEF3C7' }; // Yellow
    case 'รอแก้ไขแบบ BIM':
      return { color: '#C2410C', backgroundColor: '#FFEDD5' }; // Orange
    case 'กำลังดำเนินการ-BIM':
      return { color: '#047857', backgroundColor: '#A7F3D0' }; // Teal
    case 'วางแผนแล้ว-BIM':
      return { color: '#1D4ED8', backgroundColor: '#DBEAFE' }; // Blue
    case 'ยังไม่วางแผน-BIM':
      return { color: '#5B21B6', backgroundColor: '#EDE9FE' }; // Purple
    default:
      return { color: '#1F2937', backgroundColor: '#F3F4F6' }; // Gray
  }
}

export default function ActivityTable() {
  const { selectedStatus, selectedProject, excludedStatuses } = useDashboard();
  const [allActivities, setAllActivities] = useState<RecentActivity[]>([]);
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof RecentActivity>('dueDate');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [displayedActivities, setDisplayedActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    getRecentActivities().then(data => {
      setAllActivities(data);
    });
  }, []);

  useEffect(() => {
    let filteredActivities = allActivities;

    if (excludedStatuses.length > 0) {
        filteredActivities = filteredActivities.filter(activity => !excludedStatuses.includes(activity.status));
    }

    if (selectedStatus) {
      filteredActivities = filteredActivities.filter(activity => activity.status === selectedStatus);
    }

    if (selectedProject && selectedProject !== 'all') {
      filteredActivities = filteredActivities.filter(activity => activity.projectName === selectedProject);
    }

    setDisplayedActivities(filteredActivities);
  }, [selectedStatus, selectedProject, excludedStatuses, allActivities]);

  const handleRequestSort = (property: keyof RecentActivity) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleRowClick = (activity: RecentActivity) => {
    setSelectedRowId(activity.id);
  };

  const sortedActivities = [...displayedActivities].sort((a, b) => {
    if (orderBy === 'runningNumber') return 0;
    const valueA = a[orderBy as keyof RecentActivity];
    const valueB = b[orderBy as keyof RecentActivity];
    
    if (valueA instanceof Date && valueB instanceof Date) {
      if (isNaN(valueA.getTime())) return 1;
      if (isNaN(valueB.getTime())) return -1;
      return order === 'asc' 
        ? valueA.getTime() - valueB.getTime()
        : valueB.getTime() - valueA.getTime();
    }
    
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return order === 'asc'
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    }
    
    return 0;
  });

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                >
                  {column.id === 'runningNumber' ? (
                    column.label
                  ) : (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleRequestSort(column.id as keyof RecentActivity)}
                    >
                      {column.label}
                    </TableSortLabel>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedActivities.map((activity, index) => {
                return (
                  <TableRow
                    hover
                    role="checkbox"
                    tabIndex={-1}
                    key={activity.id}
                    onClick={() => handleRowClick(activity)}
                    selected={selectedRowId === activity.id}
                    sx={{ cursor: 'pointer' }}
                  >
                    {columns.map((column) => {
                      if (column.id === 'runningNumber') {
                        return (
                          <TableCell key={column.id} align={column.align}>
                            {index + 1}
                          </TableCell>
                        );
                      }

                      const value = activity[column.id as keyof RecentActivity];
                      
                      if (column.id === 'status') {
                        const statusStyle = getStatusColor(activity.status);
                        return (
                          <TableCell key={column.id} align={column.align}>
                            <Chip
                              label={value as string}
                              sx={{
                                color: statusStyle.color,
                                backgroundColor: statusStyle.backgroundColor,
                                fontWeight: 'medium'
                              }}
                            />
                          </TableCell>
                        );
                      }
                      
                      return (
                        <TableCell key={column.id} align={column.align}>
                          {column.format && (column.id === 'dueDate' || value instanceof Date)
                            ? column.format(value)
                            : String(value ?? '')}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
