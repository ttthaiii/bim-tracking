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
import { RecentActivity } from '@/services/dashboardService';

type Order = 'asc' | 'desc';

interface Column {
  id: keyof RecentActivity;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
}

const columns: Column[] = [
  { id: 'date', label: 'วันที่', minWidth: 100, 
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
  switch (status) {
    case 'pending':
      return { color: '#B45309', backgroundColor: '#FEF3C7' }; // สีเหลือง
    case 'in_progress':
      return { color: '#1D4ED8', backgroundColor: '#DBEAFE' }; // สีน้ำเงิน
    case 'completed':
      return { color: '#065F46', backgroundColor: '#D1FAE5' }; // สีเขียว
    case 'cancelled':
      return { color: '#991B1B', backgroundColor: '#FEE2E2' }; // สีแดง
    default:
      return { color: '#1F2937', backgroundColor: '#F3F4F6' }; // สีเทา
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'pending':
      return 'รอดำเนินการ';
    case 'in_progress':
      return 'กำลังดำเนินการ';
    case 'completed':
      return 'เสร็จสิ้น';
    case 'cancelled':
      return 'ยกเลิก';
    default:
      return status;
  }
}

interface ActivityTableProps {
  activities: RecentActivity[];
  onActivitySelect?: (activity: RecentActivity) => void;
}

export default function ActivityTable({ activities, onActivitySelect }: ActivityTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof RecentActivity>('date');
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

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
    setSelectedActivity(activity.id);
    if (onActivitySelect) {
      onActivitySelect(activity);
    }
  };

  // เรียงลำดับข้อมูล
  const sortedActivities = activities.sort((a, b) => {
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
                    selected={selectedActivity === activity.id}
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
                            value
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
        count={activities.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="แถวต่อหน้า"
        labelDisplayedRows={({ from, to, count }) => 
          `${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
        }
      />
    </Paper>
  );
}