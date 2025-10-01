import React from 'react';
import { Grid, TextField, Select, MenuItem, InputLabel, FormControl, Box } from '@mui/material';
import DatePicker from 'react-datepicker';
import { useDashboard } from '@/context/DashboardContext';

// Custom Input for DatePicker that uses MUI's TextField
const CustomDateInput = React.forwardRef(({ value, onClick, label }: any, ref: any) => (
  <TextField
    label={label}
    variant="outlined"
    fullWidth
    onClick={onClick}
    ref={ref}
    value={value}
    InputProps={{ 
        readOnly: true,
    }}
  />
));

export default function FilterBar() {
  const {
    projects,
    statuses,
    selectedProject,
    selectedStatus,
    setSelectedProject,
    setSelectedStatus,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
  } = useDashboard();

  return (
    <Grid container spacing={2} sx={{ mb: 4, alignItems: 'center' }}>
      {/* Date Range Pickers */}
      <Grid item xs={12} md={2}>
        <DatePicker
          selected={startDate}
          onChange={(date: Date | null) => setStartDate(date)}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          customInput={<CustomDateInput label="Start Date" />}
          dateFormat="yyyy-MM-dd"
          placeholderText="Start Date"
        />
      </Grid>
      <Grid item xs={12} md={2}>
        <DatePicker
          selected={endDate}
          onChange={(date: Date | null) => setEndDate(date)}
          selectsEnd
          startDate={startDate}
          endDate={endDate}
          minDate={startDate}
          customInput={<CustomDateInput label="End Date" />}
          dateFormat="yyyy-MM-dd"
          placeholderText="End Date"
        />
      </Grid>

      {/* Project Filter */}
      <Grid item xs={12} md={4}>
        <FormControl fullWidth variant="outlined">
          <InputLabel id="project-filter-label">Project</InputLabel>
          <Select
            labelId="project-filter-label"
            id="project-filter"
            value={selectedProject || 'All'}
            onChange={(e) => setSelectedProject(e.target.value === 'All' ? null : e.target.value)}
            label="Project"
          >
            <MenuItem value="All"><em>All Projects</em></MenuItem>
            {projects.map((project) => (
              <MenuItem key={project} value={project}>
                {project}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {/* Status Filter */}
      <Grid item xs={12} md={4}>
        <FormControl fullWidth variant="outlined">
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            id="status-filter"
            value={selectedStatus || 'All'}
            onChange={(e) => setSelectedStatus(e.target.value === 'All' ? null : e.target.value)}
            label="Status"
          >
            <MenuItem value="All"><em>All Statuses</em></MenuItem>
            {statuses.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );
}
