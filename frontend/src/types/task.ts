export interface Task {
  subtaskId: string;
  relateDrawing: string;
  activity: string;
  relateWork: string;
  internalRev: number;
  workScale: number;
  assignee: string;
  deadline: string;
  progress: number;
  linkFile?: string;
  isCorrect: boolean;
}

export interface TaskFormData extends Omit<Task, 'subtaskId' | 'progress' | 'isCorrect'> {
  projectName: string;
}