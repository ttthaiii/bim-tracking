'use client';

import { Box, Container, Typography, Button, Paper, IconButton, FormControl, InputLabel, Select, MenuItem, Autocomplete, TextField } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PageLayout from '@/components/shared/PageLayout';
import { useState, useEffect } from 'react';
import { Project, getProjects } from '@/lib/projects';
import { DrawingOption, getDrawingsByProjectId, TaskOption, getTasksByProjectId } from '@/lib/tasks';

export default function TaskAssignment() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [drawings, setDrawings] = useState<DrawingOption[]>([]);
  const [selectedDrawing, setSelectedDrawing] = useState<DrawingOption | null>(null);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawingLoading, setDrawingLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectList = await getProjects();
        setProjects(projectList);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    const fetchDrawings = async () => {
      if (!selectedProject) {
        setDrawings([]);
        return;
      }
      
      setDrawingLoading(true);
      try {
        const drawingList = await getDrawingsByProjectId(selectedProject);
        setDrawings(drawingList);
      } catch (error) {
        console.error('Error fetching drawings:', error);
      } finally {
        setDrawingLoading(false);
      }
    };

    fetchDrawings();
  }, [selectedProject]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!selectedProject) {
        setTasks([]);
        setSelectedTask(null);
        return;
      }
      
      setTaskLoading(true);
      try {
        const taskList = await getTasksByProjectId(selectedProject);
        setTasks(taskList);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setTaskLoading(false);
      }
    };

    fetchTasks();
  }, [selectedProject]);

  // ฟังก์ชันสำหรับจัดการการแก้ไข
  const handleEdit = (taskId: string) => {
    setSelectedTaskId(taskId);
    // TODO: เพิ่ม logic สำหรับเปิด popup แก้ไข
  };

  // ฟังก์ชันสำหรับจัดการการลบ
  const handleDelete = (taskId: string) => {
    if (window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
      // TODO: เพิ่ม logic สำหรับลบข้อมูล
      console.log('Deleting task:', taskId);
    }
  };

  return (
    <PageLayout>
      <Container maxWidth={false} sx={{ px: 4 }}>
        <Box sx={{ my: 4 }}>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ 
              color: '#1F2937',
              fontWeight: 'bold',
              marginBottom: '1.5rem',
              borderBottom: '2px solid #E5E7EB',
              paddingBottom: '0.5rem'
            }}
          >
            Task Assignment
          </Typography>
          
          <FormControl 
            fullWidth 
            sx={{ 
              mb: 4,
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: '#2563EB',
                },
              },
            }}
          >
            <InputLabel id="project-select-label">Project Name</InputLabel>
            <Select
              labelId="project-select-label"
              value={selectedProject}
              label="Project Name"
              onChange={(e) => setSelectedProject(e.target.value)}
              disabled={loading}
            >
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Paper 
            sx={{ 
              width: '100%', 
              mb: 4, 
              overflow: 'visible',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              borderRadius: '0.75rem'
            }}
          >
            <div className="w-full">
              <table className="w-full">
                <thead className="bg-[#FF5722]"><tr>
                  <th className="w-[8%] px-3 py-4 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Subtask ID</th>
                  <th className="w-[20%] px-3 py-4 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Relate Drawing</th>
                  <th className="w-[8%] px-3 py-4 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Activity</th>
                  <th className="w-[20%] px-3 py-4 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Relate Work</th>
                  <th className="w-[8%] px-3 py-4 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Internal Rev.</th>
                  <th className="w-[8%] px-3 py-4 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Work Scale</th>
                  <th className="w-[12%] px-3 py-4 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Assignee</th>
                  <th className="w-[4%] px-3 py-4 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Deadline</th>
                  <th className="w-[4%] px-3 py-4 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Progress</th>
                  <th className="w-[4%] px-3 py-4 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Link File</th>
                  <th className="w-[4%] px-3 py-4 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Correct</th>
                </tr></thead>
                <tbody className="bg-white divide-y divide-gray-200"><tr className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-3 py-4 text-sm">TSK-001</td>
                  <td className="px-3 py-4 text-sm">
                    <Autocomplete
                      size="small"
                      options={drawings}
                      loading={drawingLoading}
                      value={selectedDrawing}
                      onChange={(_, newValue) => setSelectedDrawing(newValue)}
                      getOptionLabel={(option) => option.relateDrawing}
                      disabled={!selectedProject}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="outlined"
                          placeholder="Select Drawing"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              padding: '2px 8px',
                              '& fieldset': {
                                borderColor: 'rgb(209, 213, 219)'
                              },
                              '&:hover fieldset': {
                                borderColor: '#2563EB'
                              }
                            }
                          }}
                        />
                      )}
                    />
                  </td>
                  <td className="px-3 py-4 text-sm">Auto</td>
                  <td className="px-3 py-4 text-sm">Framing Plans</td>
                  <td className="px-3 py-4 text-sm">1</td>
                  <td className="px-3 py-4 text-sm">S</td>
                  <td className="px-3 py-4 text-sm">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm">W</div>
                      <span className="ml-2 font-medium">Wanchai</span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm">3 Days</td>
                  <td className="px-3 py-4 text-sm">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: '45%' }}></div>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm">
                    <Button 
                      size="small" 
                      variant="outlined"
                      sx={{
                        borderRadius: '0.5rem',
                        '&:hover': {
                          backgroundColor: '#2563EB',
                          color: 'white'
                        }
                      }}
                    >Link</Button>
                  </td>
                  <td className="px-3 py-4 text-sm">
                    <div className="flex items-center space-x-2 justify-center">
                      <IconButton 
                        size="small" 
                        onClick={() => handleEdit('TSK-001')}
                        sx={{
                          padding: '4px',
                          backgroundColor: '#EDF2F7',
                          '&:hover': {
                            backgroundColor: '#E2E8F0',
                          }
                        }}
                      >
                        <EditIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                      <span className="text-gray-300">/</span>
                      <IconButton 
                        size="small"
                        onClick={() => handleDelete('TSK-001')}
                        sx={{
                          padding: '4px',
                          backgroundColor: '#FEE2E2',
                          '&:hover': {
                            backgroundColor: '#FED7D7',
                          }
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    </div>
                  </td>
                </tr></tbody>
              </table>
            </div>
          </Paper>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              size="large"
              sx={{
                bgcolor: '#2563EB',
                px: 6,
                py: 1.5,
                borderRadius: '0.75rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                textTransform: 'none',
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)',
                '&:hover': {
                  bgcolor: '#1D4ED8',
                  boxShadow: '0 6px 8px -1px rgba(37, 99, 235, 0.4)',
                }
              }}
            >Assign Task</Button>
          </Box>
        </Box>
      </Container>
    </PageLayout>
  );
}