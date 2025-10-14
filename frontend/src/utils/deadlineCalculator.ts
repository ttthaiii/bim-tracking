import { Timestamp } from 'firebase/firestore';

export interface DeadlineStatus {
  text: string;
  bgColor: string;
  isOverdue: boolean;
}

/**
 * คำนวณสถานะ Deadline ของ Subtask
 * @param subTaskProgress - ความคืบหน้า (0-100)
 * @param dueDate - Firestore Timestamp หรือ Date จาก Task
 * @param endDate - Firestore Timestamp หรือ Date (วันที่ทำเสร็จจริง)
 * @returns DeadlineStatus object
 */
export function calculateDeadlineStatus(
  subTaskProgress: number | null,
  dueDate: any,
  endDate: any
): DeadlineStatus {
  // กรณีพิเศษ: ไม่มี dueDate
  if (!dueDate) {
    return {
      text: '-',
      bgColor: '',
      isOverdue: false
    };
  }

  // ✅ แปลง dueDate เป็น JavaScript Date (รองรับทั้ง Timestamp และ Date)
  const dueDateJS = dueDate instanceof Date 
    ? dueDate 
    : dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
  
  const today = new Date();
  
  // ตั้งเวลาเป็น 00:00:00 เพื่อเปรียบเทียบเฉพาะวันที่
  today.setHours(0, 0, 0, 0);
  dueDateJS.setHours(0, 0, 0, 0);

  // Progress เป็น null ให้ถือว่า 0
  const progress = subTaskProgress ?? 0;

  // === เงื่อนไข 1: งานเสร็จแล้ว (Progress = 100) ===
  if (progress === 100) {
    if (!endDate) {
      // กรณีพิเศษ: งานเสร็จแต่ไม่มี endDate
      return {
        text: 'On deadline',
        bgColor: '',
        isOverdue: false
      };
    }

    // ✅ แปลง endDate (รองรับทั้ง Timestamp และ Date)
    const endDateJS = endDate instanceof Date 
      ? endDate 
      : endDate.toDate ? endDate.toDate() : new Date(endDate);
    endDateJS.setHours(0, 0, 0, 0);

    // เงื่อนไข 1A: เสร็จตามกำหนดหรือก่อนกำหนด
    if (endDateJS <= dueDateJS) {
      return {
        text: 'On deadline',
        bgColor: '',
        isOverdue: false
      };
    }

    // เงื่อนไข 1B: เสร็จช้ากว่ากำหนด
    const lateDays = Math.ceil((endDateJS.getTime() - dueDateJS.getTime()) / (1000 * 60 * 60 * 24));
    return {
      text: `Completed late ${lateDays} day${lateDays > 1 ? 's' : ''}`,
      bgColor: 'bg-yellow-50',
      isOverdue: false
    };
  }

  // === เงื่อนไข 2 & 3: งานยังไม่เสร็จ (Progress ≠ 100) ===
  
  // เงื่อนไข 2: เลย Deadline แล้ว (Overdue)
  if (today > dueDateJS) {
    const overdueDays = Math.ceil((today.getTime() - dueDateJS.getTime()) / (1000 * 60 * 60 * 24));
    return {
      text: `Overdue ${overdueDays} day${overdueDays > 1 ? 's' : ''}`,
      bgColor: 'bg-red-50',
      isOverdue: true
    };
  }

  // เงื่อนไข 3: ยังไม่ถึง Deadline
  const remainingDays = Math.ceil((dueDateJS.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return {
    text: `${remainingDays} day${remainingDays > 1 ? 's' : ''}`,
    bgColor: '',
    isOverdue: false
  };
}