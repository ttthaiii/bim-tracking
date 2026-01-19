import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getAllDailyReportEntries, DailyReportSummary } from '@/services/dashboardService';
import { getUsers, UserRecord } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';

const PAGE_SIZE = 50;

export default function DailyReportView() {
    const { appUser } = useAuth();
    const [entries, setEntries] = useState<DailyReportSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<UserRecord[]>([]);

    // Filters - Default to current month
    const [selectedAssignee, setSelectedAssignee] = useState('');
    const [hasSetDefault, setHasSetDefault] = useState(false);

    const [startDate, setStartDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    });
    const [selectedStatus, setSelectedStatus] = useState('All');

    // Set default assignee to current user once loaded
    useEffect(() => {
        if (appUser?.employeeId && !hasSetDefault) {
            setSelectedAssignee(appUser.employeeId);
            setHasSetDefault(true);
        }
    }, [appUser, hasSetDefault]);

    // Sorting
    const [sortKey, setSortKey] = useState<keyof DailyReportSummary | 'fullName'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Pagination / Infinite Scroll
    const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const userList = await getUsers();
                setUsers(userList);
            } catch (error) {
                console.error('Error loading users:', error);
            }
        };
        loadUsers();
    }, []);

    useEffect(() => {
        fetchData();
    }, [selectedAssignee, startDate, endDate]);

    // Reset pagination when filters change
    useEffect(() => {
        setDisplayLimit(PAGE_SIZE);
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [selectedAssignee, startDate, endDate, selectedStatus, sortKey, sortOrder]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const start = startDate ? new Date(startDate) : undefined;
            const end = endDate ? new Date(endDate) : undefined;

            const data = await getAllDailyReportEntries(start, end, selectedAssignee || undefined);

            let enrichedData = data.map(item => {
                const user = users.find(u => u.employeeId === item.employeeId);
                return {
                    ...item,
                    fullName: user?.fullName || item.employeeId
                };
            });

            // Fill Missing Dates Logic (Only if Assignee is selected)
            if (selectedAssignee && start && end) {
                const allDates: DailyReportSummary[] = [];
                const currentDate = new Date(start);
                // Ensure time is 00:00:00
                currentDate.setHours(0, 0, 0, 0);
                const loopEnd = new Date(end);
                loopEnd.setHours(0, 0, 0, 0);

                const empUser = users.find(u => u.employeeId === selectedAssignee);
                const empName = empUser?.fullName || selectedAssignee;

                while (currentDate <= loopEnd) {
                    // Fix: Use local time for date string to avoid timezone shift (which caused duplicate keys)
                    const y = currentDate.getFullYear();
                    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
                    const d = String(currentDate.getDate()).padStart(2, '0');
                    const dateStr = `${y}-${m}-${d}`;

                    const existingEntry = enrichedData.find(e => {
                        const eDate = new Date(e.date);
                        eDate.setHours(0, 0, 0, 0);
                        return eDate.getTime() === currentDate.getTime();
                    });

                    if (existingEntry) {
                        allDates.push(existingEntry);
                    } else {
                        // Determine generic status for missing day
                        const dayOfWeek = currentDate.getDay();
                        const isHoliday = dayOfWeek === 0; // Sunday

                        allDates.push({
                            id: `${selectedAssignee}-${dateStr}`,
                            employeeId: selectedAssignee,
                            fullName: empName,
                            date: new Date(currentDate),
                            totalWorkingHours: 0,
                            totalOT: 0,
                            status: isHoliday ? 'Holiday' : 'Missing'
                        });
                    }
                    // Next day
                    currentDate.setDate(currentDate.getDate() + 1);
                }

                enrichedData = allDates;
            }

            setEntries(enrichedData);
        } catch (error) {
            console.error('Error fetching dashboard daily reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const processedEntries = useMemo(() => {
        let result = entries.filter(entry => {
            if (selectedStatus === 'All') return true;
            return entry.status === selectedStatus;
        });

        result.sort((a, b) => {
            let valA: any = a[sortKey as keyof DailyReportSummary];
            let valB: any = b[sortKey as keyof DailyReportSummary];

            if (sortKey === 'date') {
                valA = (a.date as Date).getTime();
                valB = (b.date as Date).getTime();
            } else if (sortKey === 'fullName') {
                valA = a.fullName || '';
                valB = b.fullName || '';
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [entries, selectedStatus, sortKey, sortOrder]);

    const displayedEntries = processedEntries.slice(0, displayLimit);

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            if (scrollTop + clientHeight >= scrollHeight - 50) {
                if (displayLimit < processedEntries.length) {
                    setDisplayLimit(prev => prev + PAGE_SIZE);
                }
            }
        }
    };

    const handleSort = (key: keyof DailyReportSummary | 'fullName') => {
        if (sortKey === key) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder(key === 'date' ? 'desc' : 'asc'); // Exception: Date default desc
        }
    };

    const SortIcon = ({ colKey }: { colKey: keyof DailyReportSummary | 'fullName' }) => {
        if (sortKey !== colKey) return <span className="text-gray-300 ml-1">⇅</span>;
        return <span className="ml-1 text-indigo-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <div className="space-y-6">
            {/* Filters Area - Separated from Table */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                        <select
                            className="w-full border rounded-md p-2"
                            value={selectedAssignee}
                            onChange={(e) => setSelectedAssignee(e.target.value)}
                        >
                            <option value="">All Assignees</option>
                            {users.map(u => (
                                <option key={u.id} value={u.employeeId}>{u.fullName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                className="border rounded-md p-2"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                                type="date"
                                className="border rounded-md p-2"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            className="w-full border rounded-md p-2"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            <option value="All">All Status</option>
                            <option value="Normal">Normal (ปกติ)</option>
                            <option value="Abnormal">Abnormal (ผิดปกติ)</option>
                            <option value="Holiday">Holiday (วันหยุด)</option>
                            <option value="Missing">Missing (ขาดส่ง)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col h-[600px]">
                {/* Fixed Header */}
                <div className="bg-gray-50 border-b border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[80px]">No.</th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('fullName')}
                                >
                                    Employee Name <SortIcon colKey="fullName" />
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('date')}
                                >
                                    Date <SortIcon colKey="date" />
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('totalWorkingHours')}
                                >
                                    Total Working Hours <SortIcon colKey="totalWorkingHours" />
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('totalOT')}
                                >
                                    Total OT <SortIcon colKey="totalOT" />
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('status')}
                                >
                                    Status <SortIcon colKey="status" />
                                </th>
                            </tr>
                        </thead>
                    </table>
                </div>

                {/* Scrollable Body */}
                <div
                    className="overflow-y-auto flex-1"
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                >
                    <table className="min-w-full divide-y divide-gray-200">
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td>
                                </tr>
                            ) : displayedEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No data found</td>
                                </tr>
                            ) : (
                                displayedEntries.map((entry, index) => (
                                    <tr key={entry.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-[80px]">{index + 1}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.fullName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {entry.date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.totalWorkingHours.toFixed(2)} hrs</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.totalOT.toFixed(2)} hrs</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${entry.status === 'Normal' ? 'bg-green-100 text-green-800' :
                                                    entry.status === 'Abnormal' ? 'bg-orange-100 text-orange-800' :
                                                        entry.status === 'Missing' ? 'bg-red-200 text-red-900 border border-red-300' :
                                                            'bg-gray-100 text-gray-800'}`}>
                                                {entry.status === 'Normal' ? 'ปกติ' :
                                                    entry.status === 'Abnormal' ? 'ผิดปกติ' :
                                                        entry.status === 'Missing' ? 'ขาดส่ง' : 'วันหยุด'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
