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
  const [step, setStep] = useState(1); // 1=Download, 2=Upload, 3=Preview
  const [parsedTasks, setParsedTasks] = useState<any[]>([]);

  if (!isOpen) return null;

  // ========== STEP 1: Download Template ==========
  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Import Template');

    // Title
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = '📥 BIM Tracking - Import Template';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF1f2937' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe5e7eb' } };
    worksheet.getRow(1).height = 30;

    // Instruction
    worksheet.mergeCells('A2:G2');
    const instructionCell = worksheet.getCell('A2');
    instructionCell.value = '⚠️ กรุณากรอกข้อมูลตามคอลัมน์ที่มีเครื่องหมาย * (Required)';
    instructionCell.font = { size: 11, italic: true, color: { argb: 'FF6b7280' } };
    instructionCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 25;

    // Headers
    const headerRow = 4;
    const headers = [
      'TASK NAME *',
      'ACTIVITY *',
      'PLAN START *',
      'DUE DATE *',
      'REV',
      'DOC NO',
      'LINK'
    ];

    headers.forEach((header, index) => {
      const cell = worksheet.getCell(headerRow, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Column widths
    worksheet.getColumn(1).width = 35; // Task Name
    worksheet.getColumn(2).width = 20; // Activity
    worksheet.getColumn(3).width = 15; // Start Date
    worksheet.getColumn(4).width = 15; // Due Date
    worksheet.getColumn(5).width = 10; // Rev
    worksheet.getColumn(6).width = 15; // Doc No
    worksheet.getColumn(7).width = 30; // Link

    // Example data
    const exampleRow = 5;
    worksheet.getRow(exampleRow).values = [
      'แบบขยายห้องน้ำ WC01',
      'Architecture',
      '2025-01-15',
      '2025-02-28',
      '00',
      'ARC-001',
      ''
    ];
    worksheet.getRow(exampleRow).font = { italic: true, color: { argb: 'FF6b7280' } };

    // Activities Note
    worksheet.mergeCells('A7:G7');
    const noteCell = worksheet.getCell('A7');
    noteCell.value = `💡 Activities ที่ใช้ได้: ${activities.join(', ')}`;
    noteCell.font = { size: 10, italic: true, color: { argb: 'FF059669' } };
    noteCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFd1fae5' } };
    noteCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    worksheet.getRow(7).height = 35;

    // Export
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, `Import_Template_${projectName}.xlsx`);
  };

  // ========== RENDER ==========
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
        {/* Header */}
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
            📥 Import Excel
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: '8px 0 0 0'
          }}>
            Step {step} of 3
          </p>
        </div>

        {/* Body */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1
        }}>
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
                  💡 <strong>หมายเหตุ:</strong> หลังจากดาวน์โหลดแล้ว กรุณากรอกข้อมูลใน Excel และกลับมากดปุ่ม "ถัดไป"
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
                📄 ลากไฟล์มาวางที่นี่ หรือ
            </p>
            <input 
                type="file" 
                accept=".xlsx"
                onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                    console.log('File selected:', file.name);
                    // จะทำ Parse ใน Step 3
                }
                }}
                style={{ display: 'none' }}
                id="file-upload"
            />
            <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                {/* ✅ ใช้ span แทน button */}
                <span
                style={{
                    display: 'inline-block',
                    padding: '10px 20px',
                    background: '#3b82f6',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#2563eb';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#3b82f6';
                }}
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

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          background: '#f9fafb',
          display: 'flex',
          justifyContent: 'space-between'
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
            ยกเลิก
          </button>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
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
                ← ย้อนกลับ
              </button>
            )}
            
            {step < 3 && (
              <button
                onClick={() => setStep(step + 1)}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#fff',
                  background: '#3b82f6',
                  cursor: 'pointer'
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