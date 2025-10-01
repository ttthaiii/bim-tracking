import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  TableSortLabel,
  Chip
} from '@mui/material';
import { RecentActivity, getRecentActivities } from '@/services/dashboardService'; // Import getRecentActivities
import { useDashboard } from '@/context/DashboardContext';

type Order = 'asc' | 'desc';

interface Column {
  id: keyof RecentActivity | 'runningNumber';
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
}

// ... (columns and getStatusColor remain the same)
const columns: Column[] = [
  { id: 'runningNumber', label: 'ลำดับ', minWidth: 50, align: 'center' },
  { 
    id: 'date', 
    label: 'วันที่', 
    minWidth: 100,
    format: (value: Date) => value.toLocaleDateString('th-TH')
  },
  { id: 'projectName', label: 'โครงการ', minWidth: 130 },
  { id: 'documentNumber', label: 'เลขที่เอกสาร', minWidth: 150 },
  { id: 'description', label: 'กิจกรรม', minWidth: 250 },
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

export default function ActivityTable() { // Removed activities from props
  const { selectedStatus, selectedProject, excludedStatuses, setSelectedActivity } = useDashboard(); // Added excludedStatuses
  const [allActivities, setAllActivities] = useState<RecentActivity[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof RecentActivity>('date');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [displayedActivities, setDisplayedActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    // Fetch activities inside the component
    getRecentActivities().then(data => {
      setAllActivities(data);
    });
  }, []);

  useEffect(() => {
    let filteredActivities = allActivities;

    // Filter by legend (excludedStatuses)
    if (excludedStatuses.length > 0) {
        filteredActivities = filteredActivities.filter(activity => !excludedStatuses.includes(activity.status));
    }

    // Filter by direct click on chart (selectedStatus)
    if (selectedStatus) {
      filteredActivities = filteredActivities.filter(activity => activity.status === selectedStatus);
    }

    // Filter by project dropdown (selectedProject)
    if (selectedProject && selectedProject !== 'all') {
      filteredActivities = filteredActivities.filter(activity => activity.projectName === selectedProject);
    }

    setDisplayedActivities(filteredActivities);
    setPage(0);
  }, [selectedStatus, selectedProject, excludedStatuses, allActivities]); // Added excludedStatuses and allActivities


  const handleRequestSort = (property: keyof RecentActivity) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleRowClick = (activity: RecentActivity) => {
    setSelectedRowId(activity.id);
    // setSelectedActivity(activity); // This might be used for a detail view
  };

  const sortedActivities = [...displayedActivities].sort((a, b) => {
    if (orderBy === 'runningNumber') return 0;
    const valueA = a[orderBy as keyof RecentActivity];
    const valueB = b[orderBy as keyof RecentActivity];
    
    if (valueA instanceof Date && valueB instanceof Date) {
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
            {sortedActivities
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((activity, index) => {
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
                            {page * rowsPerPage + index + 1}
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
                          {column.format && value instanceof Date
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
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={displayedActivities.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="แถวต่อหน้า"
        labelDisplayedRows={({ from, to, count }: { from: number, to: number, count: number }) => 
          `${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
        }
      />
    </Paper>
  );
}
