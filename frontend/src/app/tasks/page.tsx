'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import PageLayout from '@/components/shared/PageLayout';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import RelateWorkSelect from './components/RelateWorkSelect';
import { getProjects, Project } from '@/lib/projects';

interface TaskItem {
  id: string;
  taskName: string;
  taskCategory: string;  // เพิ่ม
}

interface SubtaskRow {
  id: string;
  subtaskId: string;
  relateDrawing: string;
  relateDrawingName: string;
  activity: string;
  relateWork: string;
  internalRev: number;
  workScale: string;
  assignee: string;
  deadline: string;
  progress: number;
}

export default function TaskAssignment() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [rows, setRows] = useState<SubtaskRow[]>([
    {
      id: '1',
      subtaskId: 'TSK-001',
      relateDrawing: '',
      relateDrawingName: '',
      activity: '',
      relateWork: '',
      internalRev: 1,
      workScale: 'S',
      assignee: '',
      deadline: '',
      progress: 0
    }
  ]);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
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
    const fetchProjectData = async () => {
      if (!selectedProject) {
        setTasks([]);
        setRows([{
          id: '1',
          subtaskId: 'TSK-001',
          relateDrawing: '',
          relateDrawingName: '',
          activity: '',
          relateWork: '',
          internalRev: 1,
          workScale: 'S',
          assignee: '',
          deadline: '',
          progress: 0
        }]);
        return;
      }

      try {
        const tasksCol = collection(db, 'tasks');
        const q = query(tasksCol, where('projectId', '==', selectedProject));
        const snapshot = await getDocs(q);
        
        const taskList: TaskItem[] = snapshot.docs.map(doc => ({
          id: doc.id,
          taskName: doc.data().taskName || '',
          taskCategory: doc.data().taskCategory || ''  // เพิ่ม
        }));

        console.log('📋 Tasks loaded:', taskList);
        setTasks(taskList);

        if (taskList.length > 0) {
          const newRows = taskList.map((task, index) => ({
            id: (index + 1).toString(),
            subtaskId: `TSK-${String(index + 1).padStart(3, '0')}`,
            relateDrawing: task.id,
            relateDrawingName: task.taskName,
            activity: task.taskCategory,  // ใส่ taskCategory เป็นค่า default
            relateWork: '',
            internalRev: 1,
            workScale: 'S',
            assignee: '',
            deadline: '',
            progress: 0
          }));
          setRows(newRows);
        } else {
          setRows([{
            id: '1',
            subtaskId: 'TSK-001',
            relateDrawing: '',
            relateDrawingName: '',
            activity: '',
            relateWork: '',
            internalRev: 1,
            workScale: 'S',
            assignee: '',
            deadline: '',
            progress: 0
          }]);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    };

    fetchProjectData();
  }, [selectedProject]);

  const updateRow = (id: string, field: keyof SubtaskRow, value: any) => {
    console.log('🔄 Updating row:', id, field, '=', value);
    setRows(prevRows => prevRows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        console.log('✅ Updated row:', updated);
        return updated;
      }
      return row;
    }));
  };

  const addRow = () => {
    const newId = (rows.length + 1).toString();
    setRows([...rows, {
      id: newId,
      subtaskId: `TSK-${newId.padStart(3, '0')}`,
      relateDrawing: '',
      relateDrawingName: '',
      activity: '',
      relateWork: '',
      internalRev: 1,
      workScale: 'S',
      assignee: '',
      deadline: '',
      progress: 0
    }]);
  };

  const deleteRow = (id: string) => {
    if (rows.length === 1) {
      alert('ต้องมีอย่างน้อย 1 แถว');
      return;
    }
    setRows(rows.filter(row => row.id !== id));
  };

  const handleAssignTask = () => {
    console.log('Assigning tasks:', rows);
    alert('จะทำการบันทึกข้อมูล');
  };

  // สร้าง unique categories สำหรับ dropdown
  const uniqueCategories = Array.from(new Set(tasks.map(t => t.taskCategory).filter(c => c)));

  return (
    <PageLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Task Assignment</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Name
          </label>
          <Select
            options={projects.map(p => ({ value: p.id, label: p.name }))}
            value={selectedProject}
            onChange={setSelectedProject}
            placeholder="Select Project"
            loading={loading}
          />
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-orange-600">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Subtask ID</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Activity</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Relate Drawing</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Relate Work</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Internal Rev.</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Work Scale</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Assignee</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Deadline</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Progress</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Link File</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Correct</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                      {row.subtaskId}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <Select
                        options={uniqueCategories.map(cat => ({ 
                          value: cat,
                          label: cat 
                        }))}
                        value={row.activity}
                        onChange={(value) => {
                          console.log('🎯 Activity selected:', value);
                          updateRow(row.id, 'activity', value);
                          updateRow(row.id, 'relateWork', '');
                        }}
                        placeholder="Select"
                        disabled={!selectedProject}
                      />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <Select
                        options={tasks.map(t => ({ 
                          value: t.id,
                          label: t.taskName 
                        }))}
                        value={row.relateDrawing}
                        onChange={(value) => {
                          const task = tasks.find(t => t.id === value);
                          updateRow(row.id, 'relateDrawing', value);
                          updateRow(row.id, 'relateDrawingName', task?.taskName || '');
                          updateRow(row.id, 'activity', task?.taskCategory || '');
                        }}
                        placeholder="Select"
                        disabled={!selectedProject}
                      />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <RelateWorkSelect
                        activityId={row.activity}
                        value={row.relateWork}
                        onChange={(value) => updateRow(row.id, 'relateWork', value)}
                      />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-center">
                      <input
                        type="number"
                        value={row.internalRev}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          updateRow(row.id, 'internalRev', isNaN(val) ? 1 : val);
                        }}
                        className="w-12 px-1 py-1 border border-gray-300 rounded text-center text-xs"
                        min="1"
                      />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <Select
                        options={[
                          { value: 'S', label: 'S' },
                          { value: 'M', label: 'M' },
                          { value: 'L', label: 'L' }
                        ]}
                        value={row.workScale}
                        onChange={(value) => updateRow(row.id, 'workScale', value)}
                      />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {row.assignee ? (
                        <Badge name={row.assignee} size="sm" showFullName={false} />
                      ) : (
                        <input
                          type="text"
                          value={row.assignee}
                          onChange={(e) => updateRow(row.id, 'assignee', e.target.value)}
                          placeholder="Name"
                          className="w-20 px-1 py-1 border border-gray-300 rounded text-xs"
                        />
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <input
                        type="text"
                        value={row.deadline}
                        onChange={(e) => updateRow(row.id, 'deadline', e.target.value)}
                        placeholder="3 Days"
                        className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
                      />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <ProgressBar value={row.progress} size="sm" />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-center">
                      <Button variant="outline" size="sm">
                        LINK
                      </Button>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        <button onClick={() => alert('Edit')} className="p-1 text-gray-600 hover:text-blue-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <span className="text-gray-300">/</span>
                        <button onClick={() => deleteRow(row.id)} className="p-1 text-gray-600 hover:text-red-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t">
            <Button variant="secondary" size="sm" onClick={addRow}>
              + Add Row
            </Button>
          </div>
        </div>

        <div className="flex justify-center">
          <Button size="lg" onClick={handleAssignTask} disabled={!selectedProject} className="px-12">
            Assign Task
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}