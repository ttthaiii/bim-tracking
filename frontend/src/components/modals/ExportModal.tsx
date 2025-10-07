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

  // ========== HEADER SECTION ==========
  worksheet.mergeCells('A1:C1');
  worksheet.getCell('A1').value = 'PROJECT TITLE';
  worksheet.getCell('A1').font = { bold: true, size: 14 };
  
  worksheet.mergeCells('A2:C2');
  worksheet.getCell('A2').value = projectName;
  
  worksheet.mergeCells('A3:C3');
  worksheet.getCell('A3').value = `[Project Lead]: ${projectLead}`;

  // Project info
  worksheet.getCell('G1').value = 'Project Start:';
  worksheet.getCell('H1').value = startDate.toLocaleDateString();
  worksheet.getCell('G2').value = 'Display:';
  worksheet.getCell('H2').value = 'Weekly';

  // ========== COLUMN HEADERS ==========
  const headerRow = 5;
  const headers = [
    'WBS',
    'TASK DESCRIPTION',
    'PROGRESS',
    'PLAN START',
    'PLAN END',
    'PLAN DAYS',
    'ACTUAL START',
    'ACTUAL END',
    'ACTUAL DAYS'
  ];

  headers.forEach((header, index) => {
    const cell = worksheet.getCell(headerRow, index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // ========== GENERATE DATE COLUMNS ==========
  const dateColumnStart = headers.length + 1;
  const daysBetween = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const weeks = Math.ceil(daysBetween / 7);

  // Week headers
  let currentWeekStart = new Date(startDate);
  for (let i = 0; i < weeks; i++) {
    const weekCol = dateColumnStart + i;
    const cell = worksheet.getCell(headerRow, weekCol);
    
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    cell.value = `${currentWeekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${weekEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
    cell.font = { bold: true, size: 9 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90 };
    
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  // Set column widths
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

  // ========== ADD TASK DATA ==========
  let currentRow = headerRow + 1;

  tasks.forEach((task, index) => {
    const row = worksheet.getRow(currentRow);
    
    row.getCell(1).value = index + 1;
    row.getCell(2).value = task.relateDrawing;
    row.getCell(3).value = `${Math.round(task.progress * 100)}%`;
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

    // ========== GANTT VISUALIZATION ==========
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.dueDate);
    
    let currentDate = new Date(startDate);
    
    for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const cell = row.getCell(dateColumnStart + weekIndex);
      
      if (taskStart <= weekEnd && taskEnd >= weekStart) {
        const isComplete = task.progress >= 1;
        const isInProgress = task.progress > 0 && task.progress < 1;
        
        if (isComplete) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
          };
        } else if (isInProgress) {
          cell.fill = {
            type: 'pattern',
            pattern: 'lightUp',
            fgColor: { argb: 'FF4472C4' },
            bgColor: { argb: 'FFFFFFFF' }
          };
        } else {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD9D9D9' }
          };
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

  // ========== EXPORT ==========
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const filename = `Gantt_${projectName}_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(blob, filename);
};