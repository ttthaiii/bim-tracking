import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getDashboardStats, STATUS_CATEGORIES, STATUS_COLORS, DashboardStats } from '@/services/dashboardService';

const ProjectStatusPieChart = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const dashboardStats = await getDashboardStats();
        setStats(dashboardStats);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        setError("ไม่สามารถโหลดข้อมูลสถานะเอกสารได้");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Prepare the data for the pie chart, filtering out zero-value entries
  const chartData = stats
    ? STATUS_CATEGORIES.map(category => ({
        name: category,
        value: stats.documentStatus[category] || 0,
      })).filter(entry => entry.value > 0)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[350px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[350px] text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={"80%"}
            innerRadius={"60%"}
            fill="#8884d8"
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            wrapperStyle={{ paddingTop: '20px' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+20px)] text-center">
        <p className="text-4xl font-bold">{stats?.totalDocuments || 0}</p>
        <p className="text-sm text-gray-500">เอกสาร</p>
      </div>
    </div>
  );
};

export default ProjectStatusPieChart;
