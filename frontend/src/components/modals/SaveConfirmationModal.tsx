import React from 'react';

interface SaveData {
  updated: Array<{ id: string; name: string; changes: string[]; rowIdx?: number }>;
  created: Array<{ id: string; name: string; changes: string[] }>;
}

interface SaveConfirmationModalProps {
  isOpen: boolean;
  data: SaveData;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean; // ✅ Added isLoading prop
}

export default function SaveConfirmationModal({
  isOpen,
  data,
  onConfirm,
  onCancel,
  isLoading = false // ✅ Default to false
}: SaveConfirmationModalProps) {
  if (!isOpen) return null;

  const totalCount = data.updated.length + data.created.length;

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
        maxWidth: '900px',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#111827',
            margin: 0
          }}>
            ยืนยันการบันทึกข้อมูล
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: '8px 0 0 0'
          }}>
            กรุณาตรวจสอบข้อมูลก่อนบันทึก
          </p>
        </div>

        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              padding: '16px',
              borderRadius: '6px',
              background: '#fef3c7',
              border: '1px solid #fbbf24'
            }}>
              <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 500 }}>
                แก้ไขข้อมูล
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#92400e', marginTop: '4px' }}>
                {data.updated.length}
              </div>
              <div style={{ fontSize: '11px', color: '#92400e', marginTop: '2px' }}>
                รายการ
              </div>
            </div>

            <div style={{
              padding: '16px',
              borderRadius: '6px',
              background: '#dbeafe',
              border: '1px solid #3b82f6'
            }}>
              <div style={{ fontSize: '12px', color: '#1e3a8a', fontWeight: 500 }}>
                เพิ่มข้อมูลใหม่
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#1e3a8a', marginTop: '4px' }}>
                {data.created.length}
              </div>
              <div style={{ fontSize: '11px', color: '#1e3a8a', marginTop: '2px' }}>
                รายการ
              </div>
            </div>
          </div>

          {totalCount > 0 && (
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', width: '80px' }}>
                      ประเภท
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', width: '160px' }}>
                      TASK ID
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', width: '180px' }}>
                      ชื่อเอกสาร
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>
                      รายละเอียด
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.updated.map((item, idx) => (
                    <tr key={`update-${idx}`} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px', verticalAlign: 'top' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          background: '#fef3c7',
                          color: '#92400e',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>
                          แก้ไข
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#2563eb', fontFamily: 'monospace', fontSize: '11px', verticalAlign: 'top' }}>
                        {item.id}
                      </td>
                      <td style={{ padding: '12px', color: '#374151', fontWeight: 600, fontSize: '12px', verticalAlign: 'top' }}>
                        {item.name}
                      </td>
                      <td style={{ padding: '12px', verticalAlign: 'top' }}>
                        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '6px 8px', background: '#fef3c7', color: '#92400e', fontWeight: 600, textAlign: 'left', border: '1px solid #fbbf24', fontSize: '10px' }}>
                                ฟิลด์
                              </th>
                              <th style={{ padding: '6px 8px', background: '#fef3c7', color: '#92400e', fontWeight: 600, textAlign: 'left', border: '1px solid #fbbf24', fontSize: '10px' }}>
                                ก่อนแก้ไข
                              </th>
                              <th style={{ padding: '6px 8px', background: '#fef3c7', color: '#92400e', fontWeight: 600, textAlign: 'left', border: '1px solid #fbbf24', fontSize: '10px' }}>
                                หลังแก้ไข
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.changes.map((change, changeIdx) => {
                              const parts = change.split('→');
                              const fieldName = change.split(':')[0];

                              if (parts.length === 2) {
                                const before = parts[0].split(':')[1]?.trim() || '-';
                                const after = parts[1].trim();

                                return (
                                  <tr key={`change-${changeIdx}`}>
                                    <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', background: '#fff', fontWeight: 500, fontSize: '11px' }}>
                                      {fieldName}
                                    </td>
                                    <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '11px' }}>
                                      {before.replace(/"/g, '')}
                                    </td>
                                    <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '11px' }}>
                                      {after.replace(/"/g, '')}
                                    </td>
                                  </tr>
                                );
                              } else {
                                return (
                                  <tr key={`change-${changeIdx}`}>
                                    <td colSpan={3} style={{ padding: '6px 8px', border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: '11px' }}>
                                      {change}
                                    </td>
                                  </tr>
                                );
                              }
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  ))}
                  {data.created.map((item, idx) => (
                    <tr key={`create-${idx}`} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px', verticalAlign: 'top' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          background: '#dbeafe',
                          color: '#1e3a8a',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>
                          ใหม่
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#2563eb', fontFamily: 'monospace', fontSize: '11px', verticalAlign: 'top' }}>
                        {item.id}
                      </td>
                      <td style={{ padding: '12px', color: '#374151', fontWeight: 600, fontSize: '12px', verticalAlign: 'top' }}>
                        {item.name}
                      </td>
                      <td style={{ padding: '12px', verticalAlign: 'top' }}>
                        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '6px 8px', background: '#dbeafe', color: '#1e3a8a', fontWeight: 600, textAlign: 'left', border: '1px solid #93c5fd', fontSize: '10px' }}>
                                ฟิลด์
                              </th>
                              <th style={{ padding: '6px 8px', background: '#dbeafe', color: '#1e3a8a', fontWeight: 600, textAlign: 'left', border: '1px solid #93c5fd', fontSize: '10px' }}>
                                ค่า
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.changes.map((change, changeIdx) => {
                              const parts = change.split(':');
                              const fieldName = parts[0].trim();
                              const value = parts[1]?.trim() || '-';

                              return (
                                <tr key={`change-${changeIdx}`}>
                                  <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', background: '#fff', fontWeight: 500, fontSize: '11px' }}>
                                    {fieldName}
                                  </td>
                                  <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '11px' }}>
                                    {value}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          background: '#f9fafb'
        }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              color: isLoading ? '#9ca3af' : '#374151',
              background: '#fff',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#fff',
              background: isLoading ? '#93c5fd' : '#3b82f6',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isLoading ? 'กำลังบันทึก...' : 'ยืนยันการบันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
}
