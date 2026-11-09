import { Platform } from 'react-native';
import type {
  Folder,
  Task,
  TaskStatus,
  TaskPriority,
  AuditAction,
  AuditLog,
} from './types';

// Exportación de tipos TypeScript centralizados (costo cero en tiempo de ejecución)
export type {
  Folder,
  Task,
  TaskStatus,
  TaskPriority,
  AuditAction,
  AuditLog,
};

// Selección dinámica y segura de la implementación según la plataforma
function getModule() {
  if (Platform.OS === 'web' || typeof window === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./database.web');
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./database.native');
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./database.web');
  }
}

export const db = new Proxy({} as any, {
  get(_target, prop) {
    const mod = getModule();
    return mod.db ? (mod.db as any)[prop] : undefined;
  },
});

export const initDatabase = (): void => getModule().initDatabase();

export const getFolders = (parentId?: number | null): Folder[] =>
  getModule().getFolders(parentId);

export const getFolderById = (id: number): Folder | null =>
  getModule().getFolderById(id);

export const getFolderBreadcrumbs = (folderId: number): Folder[] =>
  getModule().getFolderBreadcrumbs(folderId);

export const getGlobalStaleTasksCount = (): number =>
  getModule().getGlobalStaleTasksCount();

export const createFolder = (
  name: string,
  parentId?: number | null,
  color?: string,
  description?: string
): number => getModule().createFolder(name, parentId, color, description);

export const updateFolderDescription = (id: number, description: string): void =>
  getModule().updateFolderDescription(id, description);

export const updateFolderDescriptionAsync = (
  id: number,
  description: string
): Promise<void> => getModule().updateFolderDescriptionAsync(id, description);

export const deleteFolder = (id: number): void => getModule().deleteFolder(id);

export const getTasks = (folderId: number): Task[] => getModule().getTasks(folderId);

export const getDeletedTasks = (folderId?: number): Task[] =>
  getModule().getDeletedTasks(folderId);

export const createTask = (
  folderId: number,
  title: string,
  description?: string,
  status?: TaskStatus,
  priority?: TaskPriority,
  dueDate?: string | null
): number =>
  getModule().createTask(folderId, title, description, status, priority, dueDate);

export const createTaskAsync = (
  folderId: number,
  title: string,
  description?: string,
  status?: TaskStatus,
  priority?: TaskPriority,
  dueDate?: string | null
): Promise<number> =>
  getModule().createTaskAsync(folderId, title, description, status, priority, dueDate);

export const updateTaskStatus = (id: number, status: TaskStatus): void =>
  getModule().updateTaskStatus(id, status);

export const updateTaskStatusAsync = (
  id: number,
  status: TaskStatus
): Promise<void> => getModule().updateTaskStatusAsync(id, status);

export const deleteTask = (id: number): void => getModule().deleteTask(id);

export const deleteTaskAsync = (id: number): Promise<void> =>
  getModule().deleteTaskAsync(id);

export const restoreTask = (id: number): void => getModule().restoreTask(id);

export const restoreTaskAsync = (id: number): Promise<void> =>
  getModule().restoreTaskAsync(id);

export const hardDeleteTask = (id: number): void => getModule().hardDeleteTask(id);

export const hardDeleteTaskAsync = (id: number): Promise<void> =>
  getModule().hardDeleteTaskAsync(id);

export const getAuditLogs = (limit?: number, taskId?: number): AuditLog[] =>
  getModule().getAuditLogs(limit, taskId);

export const getProjectAuditLogs = (
  folderId: number,
  limit?: number,
  offset?: number
): AuditLog[] => getModule().getProjectAuditLogs(folderId, limit, offset);

export const getProjectAuditLogsAsync = (
  folderId: number,
  limit?: number,
  offset?: number
): Promise<AuditLog[]> => getModule().getProjectAuditLogsAsync(folderId, limit, offset);
