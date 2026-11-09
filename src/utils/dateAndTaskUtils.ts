import { Task, TaskStatus } from '../db/types';

export const MS_PER_DAY = 86_400_000;
export const STALE_TASK_DAYS = 7;

export const DEFAULT_FOLDER_COLOR = '#3B82F6';

export const FOLDER_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
] as const;

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Formatea una fecha con desplazamiento en días como `YYYY-MM-DD HH:mm:ss`
 */
export function formatDateTimeOffset(daysOffset = 0): string {
  const date = new Date(Date.now() + daysOffset * MS_PER_DAY);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

/**
 * Formatea una fecha con desplazamiento en días como `YYYY-MM-DD`
 */
export function formatDateOnlyOffset(daysOffset = 0): string {
  const date = new Date(Date.now() + daysOffset * MS_PER_DAY);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Formatea la hora actual como `HH:mm:ss`
 */
export function formatCurrentTime(): string {
  const now = new Date();
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
}

/**
 * Evalúa si una tarea activa en progreso lleva más de 7 días sin actualizarse (Stale Task).
 */
export function isTaskStale(task: Pick<Task, 'status' | 'updated_at' | 'is_deleted'>): boolean {
  if ((task.is_deleted ?? 0) !== 0) return false;
  if (task.status !== 'IN_PROGRESS') return false;
  if (!task.updated_at) return false;

  const updatedMs = new Date(task.updated_at.replace(' ', 'T')).getTime();
  if (Number.isNaN(updatedMs)) return false;

  return updatedMs < Date.now() - STALE_TASK_DAYS * MS_PER_DAY;
}

/**
 * Navegación de estados adyacentes en el flujo Kanban.
 */
export function getNextTaskStatus(status: TaskStatus): TaskStatus | null {
  if (status === 'TODO') return 'IN_PROGRESS';
  if (status === 'IN_PROGRESS') return 'DONE';
  return null;
}

export function getPrevTaskStatus(status: TaskStatus): TaskStatus | null {
  if (status === 'DONE') return 'IN_PROGRESS';
  if (status === 'IN_PROGRESS') return 'TODO';
  return null;
}

export function cycleTaskStatus(status: TaskStatus): TaskStatus {
  const cycle: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
  const currentIndex = cycle.indexOf(status);
  return cycle[(currentIndex + 1) % cycle.length];
}
