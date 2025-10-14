import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Task {
  id: string;
  relateDrawing: string;
  activity: string;
  startDate: string;
  dueDate: string;
  progress: number;
  statusDwg: string;
}

export const exportGanttChart = async (
  tasks: Task[],
  projectName: string,
  projectLead: string,
  startDate: Date,
  endDate: Date
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Gantt Chart');

  // ========== HEADER ==========
  worksheet.mergeCells('A1:C1');
  worksheet.getCell('A1').value = 'PROJECT TITLE';
  worksheet.getCell('A1').font = { bold: true, size: 14 };
  
  worksheet.mergeCells('A2:C2');
  worksheet.getCell('A2').value = projectName;
  
  worksheet.mergeCells('A3:C3');
  worksheet.getCell('A3').value = '[Project Lead]: ' + projectLead;

  worksheet.getCell('G1').value = 'Project Start:';
  worksheet.getCell('H1').value = startDate.toLocaleDateString();
  worksheet.getCell('G2').value = 'Display:';
  worksheet.getCell('H2').value = 'Weekly';

  // ========== HEADERS ==========
  const headerRow = 5;
  const headers = ['WBS', 'TASK DESCRIPTION', 'PROGRESS', 'PLAN START', 'PLAN END', 'PLAN DAYS', 'ACTUAL START', 'ACTUAL END', 'ACTUAL DAYS'];

  headers.forEach((header, index) => {
    const cell = worksheet.getCell(headerRow, index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // ========== DATE COLUMNS ==========
  const dateColumnStart = headers.length + 1;
  const daysBetween = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const weeks = Math.ceil(daysBetween / 7);

  // --- แก้ไข: เปลี่ยน let เป็น const ---
  const currentWeekStart = new Date(startDate);
  for (let i = 0; i < weeks; i++) {
    const weekCol = dateColumnStart + i;
    const cell = worksheet.getCell(headerRow, weekCol);
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    cell.value = currentWeekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' - ' + weekEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    cell.font = { bold: true, size: 9 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90 };
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  // Column widths
  worksheet.getColumn(1).width = 8;
  worksheet.getColumn(2).width = 30;
  worksheet.getColumn(3).width = 10;
  worksheet.getColumn(4).width = 12;
  worksheet.getColumn(5).width = 12;
  worksheet.getColumn(6).width = 10;
  worksheet.getColumn(7).width = 12;
  worksheet.getColumn(8).width = 12;
  worksheet.getColumn(9).width = 10;
  for (let i = 0; i < weeks; i++) {
    worksheet.getColumn(dateColumnStart + i).width = 3;
  }

  // ========== FREEZE PANES ==========
  worksheet.views = [
    {
      state: 'frozen',
      xSplit: 2,
      ySplit: 5,
      topLeftCell: 'C6',
      activeCell: 'C6'
    }
  ];

  // ========== TASKS ==========
  let currentRow = headerRow + 1;
  tasks.forEach((task, index) => {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = index + 1;
    row.getCell(2).value = task.relateDrawing;
    row.getCell(3).value = Math.round(task.progress * 100) + '%';
    row.getCell(4).value = task.startDate;
    row.getCell(5).value = task.dueDate;
    
    const planStart = new Date(task.startDate);
    const planEnd = new Date(task.dueDate);
    const planDays = Math.ceil((planEnd.getTime() - planStart.getTime()) / (1000 * 60 * 60 * 24));
    row.getCell(6).value = planDays;

    for (let col = 1; col <= headers.length; col++) {
      row.getCell(col).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }

    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.dueDate);
    // --- แก้ไข: เปลี่ยน let เป็น const ---
    const currentDate = new Date(startDate);
    
    for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const cell = row.getCell(dateColumnStart + weekIndex);
      
      if (taskStart <= weekEnd && taskEnd >= weekStart) {
        if (task.progress >= 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        } else if (task.progress > 0) {
          cell.fill = { type: 'pattern', pattern: 'lightUp', fgColor: { argb: 'FF4472C4' }, bgColor: { argb: 'FFFFFFFF' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        }
      }
      
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE7E6E6' } },
        left: { style: 'thin', color: { argb: 'FFE7E6E6' } },
        bottom: { style: 'thin', color: { argb: 'FFE7E6E6' } },
        right: { style: 'thin', color: { argb: 'FFE7E6E6' } }
      };
      currentDate.setDate(currentDate.getDate() + 7);
    }
    currentRow++;
  });

  // ========== LEGEND SECTION ==========
  const legendStartRow = currentRow + 2;

  // Legend Title
  worksheet.mergeCells('A' + legendStartRow + ':E' + legendStartRow);
  const legendTitle = worksheet.getCell('A' + legendStartRow);
  legendTitle.value = '📖 คำอธิบายสัญลักษณ์ (LEGEND)';
  legendTitle.font = { bold: true, size: 14, color: { argb: 'FF1f2937' } };
  legendTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe5e7eb' } };
  legendTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  legendTitle.border = {
    top: { style: 'medium' },
    left: { style: 'medium' },
    bottom: { style: 'thin' },
    right: { style: 'medium' }
  };
  worksheet.getRow(legendStartRow).height = 25;

  // Legend Item 1: งานเสร็จแล้ว
  const legend1Row = legendStartRow + 1;
  const symbol1 = worksheet.getCell('A' + legend1Row);
  symbol1.value = '';
  symbol1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  symbol1.alignment = { horizontal: 'center', vertical: 'middle' };
  symbol1.border = {
    top: { style: 'thin' },
    left: { style: 'medium' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  worksheet.mergeCells('B' + legend1Row + ':E' + legend1Row);
  const label1 = worksheet.getCell('B' + legend1Row);
  label1.value = 'งานเสร็จแล้ว (100%)';
  label1.font = { size: 12, bold: true };
  label1.alignment = { vertical: 'middle', horizontal: 'left' };
  label1.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'medium' }
  };
  worksheet.getRow(legend1Row).height = 22;

  // Legend Item 2: กำลังดำเนินการ
  const legend2Row = legendStartRow + 2;
  const symbol2 = worksheet.getCell('A' + legend2Row);
  symbol2.value = '';
  symbol2.fill = {
    type: 'pattern',
    pattern: 'lightUp',
    fgColor: { argb: 'FF4472C4' },
    bgColor: { argb: 'FFFFFFFF' }
  };
  symbol2.alignment = { horizontal: 'center', vertical: 'middle' };
  symbol2.border = {
    top: { style: 'thin' },
    left: { style: 'medium' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  worksheet.mergeCells('B' + legend2Row + ':E' + legend2Row);
  const label2 = worksheet.getCell('B' + legend2Row);
  label2.value = 'กำลังดำเนินการ (1-99%)';
  label2.font = { size: 12, bold: true };
  label2.alignment = { vertical: 'middle', horizontal: 'left' };
  label2.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'medium' }
  };
  worksheet.getRow(legend2Row).height = 22;

  // Legend Item 3: ยังไม่เริ่มทำ
  const legend3Row = legendStartRow + 3;
  const symbol3 = worksheet.getCell('A' + legend3Row);
  symbol3.value = '';
  symbol3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  symbol3.alignment = { horizontal: 'center', vertical: 'middle' };
  symbol3.border = {
    top: { style: 'thin' },
    left: { style: 'medium' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  worksheet.mergeCells('B' + legend3Row + ':E' + legend3Row);
  const label3 = worksheet.getCell('B' + legend3Row);
  label3.value = 'ยังไม่เริ่มทำ (0%)';
  label3.font = { size: 12, bold: true };
  label3.alignment = { vertical: 'middle', horizontal: 'left' };
  label3.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'medium' }
  };
  worksheet.getRow(legend3Row).height = 22;

  // Additional Info
  const infoRow = legendStartRow + 4;
  worksheet.mergeCells('A' + infoRow + ':E' + infoRow);
  const infoCell = worksheet.getCell('A' + infoRow);
  infoCell.value = '📏 ความยาวของแถบสี = ระยะเวลาทำงาน (ยิ่งยาว = ใช้เวลานาน)';
  infoCell.font = { size: 11, italic: true, color: { argb: 'FF6b7280' } };
  infoCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  infoCell.border = {
    top: { style: 'thin' },
    left: { style: 'medium' },
    bottom: { style: 'medium' },
    right: { style: 'medium' }
  };
  worksheet.getRow(infoRow).height = 30;

  // Import Instructions
  const importRow = infoRow + 2;
  worksheet.mergeCells('A' + importRow + ':E' + importRow);
  const importCell = worksheet.getCell('A' + importRow);
  importCell.value = '💡 ไฟล์นี้สามารถ Import กลับเข้าระบบได้ที่หน้า Projects';
  importCell.font = { size: 11, bold: true, color: { argb: 'FF059669' } };
  importCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  importCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFd1fae5' } };
  importCell.border = {
    top: { style: 'medium' },
    left: { style: 'medium' },
    bottom: { style: 'medium' },
    right: { style: 'medium' }
  };
  worksheet.getRow(importRow).height = 25;

  // ========== EXPORT ==========
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = 'Gantt_' + projectName + '_' + new Date().toISOString().split('T')[0] + '.xlsx';
  saveAs(blob, filename);
};