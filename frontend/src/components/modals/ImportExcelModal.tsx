import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  activities: string[];
  onImport: (tasks: any[]) => void;
}

export default function ImportExcelModal({ 
  isOpen, 
  onClose, 
  projectName,
  activities,
  onImport 
}: ImportExcelModalProps) {
  const [step, setStep] = useState(1);
  // const [parsedTasks, setParsedTasks] = useState<any[]>([]); // Warning: Not used
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Import Template');

    // ========== TITLE ==========
    worksheet.mergeCells('A1:D1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = '📥 BIM Tracking - Import Template v2.0';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF1f2937' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe5e7eb' } };
    worksheet.getRow(1).height = 30;

    // ========== PROJECT NAME ==========
    worksheet.mergeCells('A2:D2');
    const projectCell = worksheet.getCell('A2');
    projectCell.value = `โปรเจกต์: ${projectName}`;
    projectCell.font = { bold: true, size: 12, color: { argb: 'FF374151' } };
    projectCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 20;

    // ========== INSTRUCTION ==========
    worksheet.mergeCells('A3:D3');
    const instructionCell = worksheet.getCell('A3');
    instructionCell.value = '⚠️ กรอกเฉพาะคอลัมน์ที่มี * | Activity: Copy-Paste จากรายการด้านล่าง | วันที่: พิมพ์ dd/mm/yyyy';
    instructionCell.font = { size: 10, italic: true, color: { argb: 'FF6b7280' } };
    instructionCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    worksheet.getRow(3).height = 30;

    // ========== HEADERS ==========
    const headerRow = 4;
    const headers = [
      { value: '📝 TASK NAME *', width: 35 },
      { value: '🏗️ ACTIVITY *', width: 30 },
      { value: '📅 START DATE *', width: 15 },
      { value: '📅 DUE DATE *', width: 15 }
    ];

    headers.forEach((header, index) => {
      const cell = worksheet.getCell(headerRow, index + 1);
      cell.value = header.value;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      worksheet.getColumn(index + 1).width = header.width;
    });
    worksheet.getRow(headerRow).height = 25;

    // ========== EXAMPLE DATA ==========
    const exampleRows = [
      ['แบบขยายห้องน้ำ WC01', activities[0] || 'Architectural Asbuilt', '15/01/2025', '28/02/2025'],
      ['แบบโครงสร้าง ST-01', activities[1] || 'Architectural Drawings', '01/02/2025', '15/03/2025'],
      ['แบบจัดสวน LS-01', activities[2] || 'Documents', '10/03/2025', '30/04/2025']
    ];

    exampleRows.forEach((rowData, idx) => {
      const rowNumber = 5 + idx;
      const row = worksheet.getRow(rowNumber);
      
      rowData.forEach((value, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        cell.value = value;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7F3FF' } };
        cell.font = { italic: true, color: { argb: 'FF6b7280' }, size: 10 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle' };
      });
      
      row.height = 20;
    });

    // ========== EMPTY ROWS ==========
    for (let i = 8; i <= 22; i++) {
      const row = worksheet.getRow(i);
      ['A', 'B', 'C', 'D'].forEach(col => {
        const cell = row.getCell(col);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
      });
      row.height = 18;
    }

    // ========== ACTIVITIES NOTE ==========
    worksheet.mergeCells('A24:D24');
    const noteCell = worksheet.getCell('A24');
    noteCell.value = `💡 Activities ที่ใช้ได้ (${activities.length} รายการ) - Copy-Paste ไปใช้ได้เลย:`;
    noteCell.font = { bold: true, size: 11, color: { argb: 'FF059669' } };
    noteCell.alignment = { horizontal: 'left', vertical: 'middle' };
    noteCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFd1fae5' } };
    noteCell.border = {
      top: { style: 'medium' },
      left: { style: 'medium' },
      right: { style: 'medium' }
    };
    worksheet.getRow(24).height = 22;

    worksheet.mergeCells('A25:D26');
    const listCell = worksheet.getCell('A25');
    listCell.value = activities.join('\n');
    listCell.font = { size: 9, color: { argb: 'FF374151' } };
    listCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    listCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf0fdf4' } };
    listCell.border = {
      left: { style: 'medium' },
      right: { style: 'medium' }
    };
    worksheet.getRow(25).height = Math.min(activities.length * 12, 120);
    worksheet.getRow(26).height = 1;

    // ========== TIPS ==========
    worksheet.mergeCells('A27:D27');
    const tipsCell = worksheet.getCell('A27');
    tipsCell.value = '💡 วิธีใช้:\n' +
      '1. ลบแถวตัวอย่าง (แถว 5-7) ก่อน Upload\n' +
      '2. Activity: Copy จากรายการด้านบน → Paste ในคอลัมน์ B (ห้ามพิมพ์เอง!)\n' +
      '3. วันที่: พิมพ์รูปแบบ dd/mm/yyyy เท่านั้น (เช่น 15/01/2025)\n' +
      '4. วันสิ้นสุดต้องมากกว่าหรือเท่ากับวันเริ่มต้น';
    tipsCell.font = { size: 9, italic: true, color: { argb: 'FF92400e' } };
    tipsCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    tipsCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFfef3c7' } };
    tipsCell.border = {
      top: { style: 'medium' },
      left: { style: 'medium' },
      bottom: { style: 'medium' },
      right: { style: 'medium' }
    };
    worksheet.getRow(27).height = 60;

    // ========== EXPORT ==========
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, `Import_Template_${projectName}_v2.xlsx`);
  };

  const handleFileSelect = (file: File | null) => {
    if (file) {
      setSelectedFile(file);
      console.log('✅ File selected:', file.name);
    }
  };

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
        maxWidth: '600px',
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
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0 }}>
            📥 Import Excel
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
            Step {step} of 3
          </p>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                ขั้นตอนที่ 1: ดาวน์โหลด Template
              </h3>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
                กรุณาดาวน์โหลด Excel Template และกรอกข้อมูลตามรูปแบบที่กำหนด
              </p>
              
              <button
                onClick={handleDownloadTemplate}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginBottom: '16px'
                }}
              >
                📥 ดาวน์โหลด Template
              </button>

              <div style={{
                padding: '16px',
                background: '#fef3c7',
                borderRadius: '6px',
                border: '1px solid #fbbf24'
              }}>
                <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>
                  {/* --- แก้ไข: เปลี่ยน "" เป็น &ldquo;&rdquo; --- */}
                  💡 <strong>หมายเหตุ:</strong> หลังจากดาวน์โหลดแล้ว กรุณากรอกข้อมูลใน Excel และกลับมากดปุ่ม &ldquo;ถัดไป&rdquo;
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                ขั้นตอนที่ 2: อัปโหลดไฟล์
              </h3>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                เลือกไฟล์ Excel ที่กรอกข้อมูลแล้ว
              </p>
              
              <div style={{
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                padding: '40px',
                textAlign: 'center',
                background: '#f9fafb'
              }}>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                  {selectedFile ? `✅ ${selectedFile.name}` : '📄 ลากไฟล์มาวางที่นี่ หรือ'}
                </p>
                <input 
                  type="file" 
                  accept=".xlsx"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                  id="file-upload"
                />
                <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      background: '#3b82f6',
                      color: 'white',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                  >
                    เลือกไฟล์
                  </span>
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3>ขั้นตอนที่ 3: ตรวจสอบข้อมูล</h3>
              <p>Preview จะแสดงที่นี่</p>
            </div>
          )}
        </div>

        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          background: '#f9fafb',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <button onClick={onClose} style={{
            padding: '10px 20px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151',
            background: '#fff',
            cursor: 'pointer'
          }}>
            ยกเลิก
          </button>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} style={{
                padding: '10px 20px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
                background: '#fff',
                cursor: 'pointer'
              }}>
                ← ย้อนกลับ
              </button>
            )}
            
            {step < 3 && (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 2 && !selectedFile}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#fff',
                  background: (step === 2 && !selectedFile) ? '#9ca3af' : '#3b82f6',
                  cursor: (step === 2 && !selectedFile) ? 'not-allowed' : 'pointer'
                }}
              >
                ถัดไป →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}