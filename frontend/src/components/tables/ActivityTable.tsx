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
  Box,
  Chip
} from '@mui/material';
import { RecentActivity, TaskWithStatus, getTaskStatusCategory } from '@/services/dashboardService';
import { useDashboard } from '@/context/DashboardContext';

type Order = 'asc' | 'desc';

interface Column {
  id: keyof RecentActivity;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
}

const columns: Column[] = [
  { 
    id: 'date', 
    label: 'วันที่', 
    minWidth: 100,
    format: (value: Date) => value.toLocaleDateString('th-TH')
  },
  { id: 'projectName', label: 'โครงการ', minWidth: 130 },
  { id: 'description', label: 'กิจกรรม', minWidth: 300 },
  { 
    id: 'status',
    label: 'สถานะ',
    minWidth: 100,
    align: 'center'
  },
];

function getStatusColor(status: string): { color: string, backgroundColor: string } {
  const statusCategory = getTaskStatusCategory({
    currentStep: status,
    subtaskCount: 0,
    totalMH: 0
  });

  switch (statusCategory) {
    case 'เสร็จสิ้น':
      return { color: '#065F46', backgroundColor: '#D1FAE5' }; // สีเขียว
    case 'รออนุมัติจาก CM':
      return { color: '#B45309', backgroundColor: '#FEF3C7' }; // สีเหลือง
    case 'รอตรวจสอบหน้างาน':
      return { color: '#1D4ED8', backgroundColor: '#DBEAFE' }; // สีน้ำเงิน
    case 'รอแก้ไขแบบ BIM':
      return { color: '#991B1B', backgroundColor: '#FEE2E2' }; // สีแดง
    case 'กำลังดำเนินการ-BIM':
      return { color: '#0E9F6E', backgroundColor: '#DEF7EC' }; // เขียวอ่อน
    case 'วางแผนแล้ว-BIM':
      return { color: '#3F83F8', backgroundColor: '#E1EFFE' }; // น้ำเงินอ่อน
    case 'ยังไม่วางแผน-BIM':
      return { color: '#6B7280', backgroundColor: '#F3F4F6' }; // สีเทา
    default:
      return { color: '#1F2937', backgroundColor: '#F3F4F6' }; // สีเทา
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'APPROVED':
    case 'APPROVED_WITH_COMMENTS':
      return 'เสร็จสิ้น';
    case 'PENDING_CM_APPROVAL':
      return 'รออนุมัติจาก CM';
    case 'PENDING_REVIEW':
      return 'รอตรวจสอบหน้างาน';
    case 'REJECTED':
      return 'รอแก้ไขแบบ BIM';
    case 'BIM_IN_PROGRESS':
      return 'กำลังดำเนินการ-BIM';
    case 'BIM_PLANNED':
      return 'วางแผนแล้ว-BIM';
    case 'BIM_NOT_PLANNED':
      return 'ยังไม่วางแผน-BIM';
    default:
      return status;
  }
}

interface ActivityTableProps {
  activities: RecentActivity[];
}

interface EnhancedTableProps {
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof RecentActivity) => void;
  order: Order;
  orderBy: string;
}

export default function ActivityTable({ activities }: ActivityTableProps) {
  console.log('All activities:', activities);
  const { selectedStatus, setFilteredActivities, setSelectedActivity } = useDashboard();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof RecentActivity>('date');

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [displayedActivities, setDisplayedActivities] = useState<RecentActivity[]>(activities);

  useEffect(() => {
    console.log('Selected Status:', selectedStatus);
    if (selectedStatus) {
      const filtered = activities.filter(activity => {
        // ใช้เกณฑ์เดียวกับ Chart
        const taskStatus = {
          currentStep: activity.status, // ใช้ status แทน currentStep
          subtaskCount: activity.subtaskCount || 0,
          totalMH: activity.totalMH || 0
        };
        const activityStatusCategory = getTaskStatusCategory(taskStatus);
        console.log(`Activity: ${activity.id}`, {
          status: activity.status,
          subtaskCount: activity.subtaskCount,
          totalMH: activity.totalMH,
          computedStatus: activityStatusCategory
        });
        return activityStatusCategory === selectedStatus;
      });
      console.log('Filtered Activities:', filtered);
      setFilteredActivities(filtered);
      setDisplayedActivities(filtered);
    } else {
      setFilteredActivities(activities);
      setDisplayedActivities(activities);
    }
    setPage(0);
  }, [selectedStatus, activities, setFilteredActivities]);

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
    setSelectedActivity(activity);
  };

  // เรียงลำดับข้อมูล
  const sortedActivities = [...displayedActivities].sort((a, b) => {
    const valueA = a[orderBy];
    const valueB = b[orderBy];
    
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
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : 'asc'}
                    onClick={() => handleRequestSort(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedActivities
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((activity) => {
                const statusStyle = getStatusColor(activity.status);
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
                      const value = activity[column.id];
                      return (
                        <TableCell key={column.id} align={column.align}>
                          {column.id === 'status' ? (
                            <Chip
                              label={getStatusText(value as string)}
                              sx={{
                                color: statusStyle.color,
                                backgroundColor: statusStyle.backgroundColor,
                                fontWeight: 'medium'
                              }}
                            />
                          ) : column.format && value instanceof Date ? (
                            column.format(value)
                          ) : (
                            String(value)
                          )}
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