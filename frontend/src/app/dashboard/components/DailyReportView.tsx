import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getAllDailyReportEntries, DailyReportSummary } from '@/services/dashboardService';
import { getPublicHolidays, PublicHoliday } from '@/services/holidayService';
import { getUsers, UserRecord } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { MultiSelect, MultiSelectOption } from '@/components/ui/MultiSelect';

const PAGE_SIZE = 50;

export default function DailyReportView() {
    const { appUser } = useAuth();
    const [entries, setEntries] = useState<DailyReportSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [holidays, setHolidays] = useState<PublicHoliday[]>([]);

    // Filters - Default to current month
    const [selectedAssignee, setSelectedAssignee] = useState('');
    const [hasSetDefault, setHasSetDefault] = useState(false);

    const [startDate, setStartDate] = useState(() => {
        // [T-047] Default to Current Week (Mon - Sun)
        const now = new Date();
        const day = now.getDay(); // 0 (Sun) - 6 (Sat)
        // Calculate diff to Monday: 
        // If today is Sunday(0), diff = -6. 
        // If Monday(1), diff = 0.
        const diffToMon = day === 0 ? -6 : 1 - day;

        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMon);
        return monday.toISOString().split('T')[0];
    });

    const [endDate, setEndDate] = useState(() => {
        // [T-047] Default to Current Week (End must be Sunday)
        const now = new Date();
        const day = now.getDay();
        const diffToMon = day === 0 ? -6 : 1 - day;

        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMon);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return sunday.toISOString().split('T')[0];
    });
    const [selectedStatus, setSelectedStatus] = useState<string[]>(['All']);

    // Set default assignee to current user once loaded
    useEffect(() => {
        if (appUser?.employeeId && !hasSetDefault) {
            setSelectedAssignee(appUser.employeeId);
            setHasSetDefault(true);
        }
    }, [appUser, hasSetDefault]);

    const [sortKey, setSortKey] = useState<keyof DailyReportSummary | 'fullName'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Expanded rows state
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleRow = (id: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Pagination / Infinite Scroll
    const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadUsersAndHolidays = async () => {
            try {
                const [userList, holidayList] = await Promise.all([
                    getUsers(),
                    getPublicHolidays() // Fetch all holidays (or filter by year if needed)
                ]);
                setUsers(userList);
                setHolidays(holidayList);
            } catch (error) {
                console.error('Error loading initial data:', error);
            }
        };
        loadUsersAndHolidays();
    }, []);

    useEffect(() => {
        fetchData();
    }, [selectedAssignee, startDate, endDate, users, holidays]);

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

            // Fill Missing Dates Logic - [T-045] Support All Assignees
            if (start && end && users.length > 0) {
                const assigneesToProcess = selectedAssignee
                    ? [selectedAssignee]
                    : users.map(u => u.employeeId);

                const finalFilledData: DailyReportSummary[] = [];

                // Helper to fill data for a single user
                assigneesToProcess.forEach(userId => {
                    const empUser = users.find(u => u.employeeId === userId);
                    const empName = empUser?.fullName || userId;

                    const userExistingEntries = enrichedData.filter(e => e.employeeId === userId);
                    const userFilledEntries: DailyReportSummary[] = [];

                    const currentDate = new Date(start);
                    currentDate.setHours(0, 0, 0, 0);
                    const loopEnd = new Date(end);
                    loopEnd.setHours(0, 0, 0, 0);

                    // To avoid infinite loops or issues, use a clone of currentDate
                    const iterDate = new Date(currentDate);

                    while (iterDate <= loopEnd) {
                        const now = new Date();
                        now.setHours(0, 0, 0, 0);

                        const y = iterDate.getFullYear();
                        const m = String(iterDate.getMonth() + 1).padStart(2, '0');
                        const d = String(iterDate.getDate()).padStart(2, '0');
                        const dateStr = `${y}-${m}-${d}`;

                        const existingEntry = userExistingEntries.find(e => {
                            const eDate = new Date(e.date);
                            eDate.setHours(0, 0, 0, 0);
                            return eDate.getTime() === iterDate.getTime();
                        });

                        if (existingEntry) {
                            userFilledEntries.push(existingEntry);
                        } else {
                            const dayOfWeek = iterDate.getDay();
                            // Check if dateStr matches any holiday
                            const holidayMatch = holidays.find(h => h.date === dateStr);
                            const isHoliday = dayOfWeek === 0 || !!holidayMatch;
                            const isFuture = iterDate > now;

                            userFilledEntries.push({
                                id: `${userId}-${dateStr}`,
                                employeeId: userId,
                                fullName: empName,
                                date: new Date(iterDate),
                                totalWorkingHours: 0,
                                totalOT: 0,
                                status: isFuture ? 'Future' : (isHoliday ? 'Holiday' : 'Missing')
                            } as any);
                        }
                        iterDate.setDate(iterDate.getDate() + 1);
                    }
                    finalFilledData.push(...userFilledEntries);
                });

                enrichedData = finalFilledData;
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
            if (selectedStatus.includes('All')) return true;
            // [T-044] Multi-select Logic
            return selectedStatus.includes(entry.status);
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
                        <MultiSelect
                            options={[
                                { value: 'All', label: 'All Status' },
                                { value: 'Normal', label: 'Normal (ปกติ)' },
                                { value: 'Abnormal', label: 'Abnormal (ผิดปกติ)' },
                                { value: 'Holiday', label: 'Holiday (วันหยุด)' },
                                { value: 'Missing', label: 'Missing (ขาดส่ง)' },
                                { value: 'Future', label: 'Future (ยังไม่ถึงกำหนด)' },
                                { value: 'Leave', label: 'Leave (ลางาน)' },
                            ]}
                            value={selectedStatus}
                            onChange={setSelectedStatus}
                            className="w-full"
                        />
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
                                <th className="px-6 py-3 text-center w-[50px]"></th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[80px]">No.</th>
                                <th
                                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('fullName')}
                                >
                                    Employee Name <SortIcon colKey="fullName" />
                                </th>
                                <th
                                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('date')}
                                >
                                    Date <SortIcon colKey="date" />
                                </th>
                                <th
                                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('totalWorkingHours')}
                                >
                                    Total Working Hours <SortIcon colKey="totalWorkingHours" />
                                </th>
                                <th
                                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('totalOT')}
                                >
                                    Total OT <SortIcon colKey="totalOT" />
                                </th>
                                <th
                                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td>
                                </tr>
                            ) : displayedEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">No data found</td>
                                </tr>
                            ) : (
                                displayedEntries.map((entry, index) => {
                                    // [T-022] Future State Styling
                                    const isFuture = (entry.status as any) === 'Future';
                                    const isLeave = (entry.status as any) === 'Leave';

                                    // [T-022-EX-2] Fix Name Mapping Race Condition
                                    // Resolve name at render time to ensure latest 'users' list is used
                                    const userObj = users.find(u => u.employeeId === entry.employeeId);
                                    const displayName = userObj?.fullName || entry.fullName || entry.employeeId;

                                    return (
                                        <React.Fragment key={entry.id}>
                                            <tr className={isFuture ? 'bg-gray-50 opacity-60' : ''}>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-gray-500 w-[50px]">
                                                    {entry.details && entry.details.length > 0 && (
                                                        <button
                                                            onClick={() => toggleRow(entry.id)}
                                                            className="text-gray-500 hover:text-gray-700 focus:outline-none"
                                                        >
                                                            {expandedRows.has(entry.id) ? '▼' : '▶'}
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-[80px]">{index + 1}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{displayName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                    {entry.date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    {isFuture ? '-' : `${entry.totalWorkingHours.toFixed(2)} hrs`}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    {isFuture ? '-' : `${entry.totalOT.toFixed(2)} hrs`}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${entry.status === 'Normal' ? 'bg-green-100 text-green-800' :
                                                            entry.status === 'Abnormal' ? 'bg-orange-100 text-orange-800' :
                                                                entry.status === 'Missing' ? 'bg-red-200 text-red-900 border border-red-300' :
                                                                    (entry.status as any) === 'Future' ? 'bg-gray-200 text-gray-500' :
                                                                        (entry.status as any) === 'Leave' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                                                            'bg-gray-100 text-gray-800'}`}>
                                                        {entry.status === 'Normal' ? 'ปกติ' :
                                                            entry.status === 'Abnormal' ? 'ผิดปกติ' :
                                                                entry.status === 'Missing' ? 'ขาดส่ง' :
                                                                    (entry.status as any) === 'Future' ? 'ยังไม่ถึงกำหนด' :
                                                                        (entry.status as any) === 'Leave' ? 'ลางาน' : 'วันหยุด'}
                                                    </span>
                                                </td>
                                            </tr>
                                            {expandedRows.has(entry.id) && entry.details && entry.details.length > 0 && (
                                                <tr className="bg-gray-50">
                                                    <td colSpan={7} className="px-8 py-4">
                                                        <div className="rounded border border-gray-200 overflow-hidden shadow-inner">
                                                            <div className="bg-gray-50 border-l-4 border-l-indigo-400 p-5">
                                                                <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">Tasks Breakdown</h4>
                                                                <div className="space-y-4">
                                                                    {entry.details.map((detail, dIndex) => {
                                                                        const progRaw = detail.progress || '0%';
                                                                        const prog = String(progRaw); // Ensure it's a string
                                                                        const isComplete = prog === '100' || prog === '100%';

                                                                        return (
                                                                            <div key={detail.id || dIndex} className="bg-white rounded-md pl-5 pr-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                                                {/* Left Group: Info */}
                                                                                <div className="flex-1 space-y-1.5">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-[15px] font-semibold text-gray-800 leading-tight">
                                                                                            {detail.taskName || '-'}
                                                                                        </span>
                                                                                        {detail.subTaskName && (
                                                                                            <>
                                                                                                <span className="text-gray-300">•</span>
                                                                                                <span className="text-[13px] text-gray-500 font-medium">{detail.subTaskName}</span>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                    {detail.item && detail.item !== '-' && (
                                                                                        <div className="text-[13px] text-gray-400 flex items-center gap-1.5 mt-1">
                                                                                            <span className="inline-block w-1 h-1 rounded-full bg-gray-300"></span>
                                                                                            {detail.item}
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                {/* Right Group: Stats */}
                                                                                <div className="flex items-center gap-8 text-[13px] whitespace-nowrap">
                                                                                    <div className="flex flex-col items-end">
                                                                                        <span className="text-[11px] text-gray-400 tracking-wider uppercase mb-0.5">Working</span>
                                                                                        <span className="font-semibold text-gray-700">{detail.workingHours ? `${detail.workingHours} hrs` : '-'}</span>
                                                                                    </div>
                                                                                    <div className="flex flex-col items-end">
                                                                                        <span className="text-[11px] text-gray-400 tracking-wider uppercase mb-0.5">OT</span>
                                                                                        <span className="font-semibold text-purple-600">{detail.otHours ? `${detail.otHours} hrs` : '-'}</span>
                                                                                    </div>
                                                                                    <div className="flex flex-col items-end justify-center h-full w-[65px]">
                                                                                        <span className="text-[11px] text-gray-400 tracking-wider uppercase mb-0.5">Progress</span>
                                                                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md w-full text-center ${isComplete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                                            {prog}{!prog.includes('%') ? '%' : ''}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
