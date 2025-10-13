import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface DeletedTask {
  id: string;
  taskNumber: string;
  taskName: string;
  taskCategory: string;
  deletedAt: any;
  projectId: string;
}

interface ViewDeletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: () => void;
  currentProjectId?: string;
}

export default function ViewDeletedModal({ 
  isOpen, 
  onClose, 
  onRestore,
  currentProjectId 
}: ViewDeletedModalProps) {
  const [deletedTasks, setDeletedTasks] = useState<DeletedTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // โหลดข้อมูลที่ลบ
  useEffect(() => {
    if (!isOpen) return;

    const fetchDeletedTasks = async () => {
      try {
        setLoading(true);
        const tasksRef = collection(db, 'tasks');
        const q = query(tasksRef, where('taskStatus', '==', 'DELETED'));
        const snapshot = await getDocs(q);
        
        let tasks = snapshot.docs.map(doc => ({
          id: doc.id,
          taskNumber: doc.data().taskNumber || '',
          taskName: doc.data().taskName || '',
          taskCategory: doc.data().taskCategory || '',
          deletedAt: doc.data().deletedAt,
          projectId: doc.data().projectId || ''
        })) as DeletedTask[];

        // กรองตามโครงการ (ถ้ามี)
        if (currentProjectId && currentProjectId !== 'all') {
          tasks = tasks.filter(t => t.projectId === currentProjectId);
        }

        // เรียงตามวันที่ลบล่าสุด
        tasks.sort((a, b) => {
          const aTime = a.deletedAt?.toMillis?.() || 0;
          const bTime = b.deletedAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

        setDeletedTasks(tasks);
      } catch (error) {
        console.error('Error fetching deleted tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeletedTasks();
  }, [isOpen, currentProjectId]);

  // กู้คืนข้อมูล
  const handleRestore = async (taskId: string) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        taskStatus: 'ACTIVE',
        deletedAt: null,
        restoredAt: Timestamp.now()
      });

      setDeletedTasks(prev => prev.filter(t => t.id !== taskId));
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });

      alert('✅ กู้คืนข้อมูลสำเร็จ');
      onRestore();
    } catch (error) {
      console.error('Error restoring task:', error);
      alert('❌ เกิดข้อผิดพลาดในการกู้คืน');
    }
  };

  // กู้คืนหลายรายการ
  const handleRestoreSelected = async () => {
    if (selectedItems.size === 0) {
      alert('⚠️ กรุณาเลือกรายการที่ต้องการกู้คืน');
      return;
    }

    try {
      const promises = Array.from(selectedItems).map(taskId => {
        const taskRef = doc(db, 'tasks', taskId);
        return updateDoc(taskRef, {
          taskStatus: 'ACTIVE',
          deletedAt: null,
          restoredAt: Timestamp.now()
        });
      });

      await Promise.all(promises);

      setDeletedTasks(prev => prev.filter(t => !selectedItems.has(t.id)));
      setSelectedItems(new Set());
      
      alert(`✅ กู้คืน ${selectedItems.size} รายการสำเร็จ`);
      onRestore();
    } catch (error) {
      console.error('Error restoring tasks:', error);
      alert('❌ เกิดข้อผิดพลาดในการกู้คืน');
    }
  };

  // Toggle selection
  const handleToggleSelect = (taskId: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setSelectedItems(newSet);
  };

  // Select all
  const handleSelectAll = () => {
    if (selectedItems.size === deletedTasks.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(deletedTasks.map(t => t.id)));
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      backgroundColor: 'rgba(0, 0, 0, 0.5)'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        width: '90%',
        maxWidth: '1000px',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#111827',
              margin: 0
            }}>
              🗑️ Deleted Items
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '8px 0 0 0'
            }}>
              รายการที่ถูกลบ ({deletedTasks.length} รายการ)
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              color: '#6b7280',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: '0.5rem',
              fontSize: '24px'
            }}
          >
            ×
          </button>
        </div>

        {/* Action Bar */}
        {selectedItems.size > 0 && (
          <div style={{
            padding: '12px 24px',
            background: '#fef3c7',
            borderBottom: '1px solid #fbbf24',
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '14px', color: '#92400e', fontWeight: 500 }}>
              เลือก {selectedItems.size} รายการ
            </span>
            <button
              onClick={handleRestoreSelected}
              style={{
                padding: '6px 16px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              ♻️ กู้คืนที่เลือก
            </button>
          </div>
        )}

        {/* Body */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              กำลังโหลด...
            </div>
          ) : deletedTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
              <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
                ไม่มีรายการที่ถูกลบ
              </p>
              <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
                รายการที่ลบจะแสดงที่นี่
              </p>
            </div>
          ) : (
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                      <input
                        type="checkbox"
                        checked={selectedItems.size === deletedTasks.length && deletedTasks.length > 0}
                        onChange={handleSelectAll}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                      TASK ID
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                      TASK NAME
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                      ACTIVITY
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                      DELETED AT
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deletedTasks.map((task, idx) => (
                    <tr 
                      key={task.id}
                      style={{ 
                        borderBottom: '1px solid #f3f4f6',
                        background: idx % 2 === 0 ? '#fff' : '#f9fafb'
                      }}
                    >
                      <td style={{ padding: '12px' }}>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(task.id)}
                          onChange={() => handleToggleSelect(task.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px', color: '#2563eb', fontFamily: 'monospace', fontSize: '12px' }}>
                        {task.taskNumber}
                      </td>
                      <td style={{ padding: '12px', color: '#111827', fontWeight: 500 }}>
                        {task.taskName}
                      </td>
                      <td style={{ padding: '12px', color: '#6b7280' }}>
                        {task.taskCategory}
                      </td>
                      <td style={{ padding: '12px', color: '#6b7280', fontSize: '12px' }}>
                        {task.deletedAt?.toDate?.().toLocaleString('th-TH') || '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleRestore(task.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: 500
                          }}
                        >
                          ♻️ กู้คืน
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          background: '#f9fafb',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}