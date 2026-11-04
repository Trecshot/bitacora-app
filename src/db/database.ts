import { Platform } from 'react-native';

// Exportación de tipos TypeScript (se eliminan en compilación, costo cero en tiempo de ejecución)
export type {
  Folder,
  Task,
  TaskStatus,
  TaskPriority,
  AuditLog,
  NoteCategory,
  Note,
} from './database.web';

export { generateUUID } from './database.web';

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

export const initDatabase: () => void = () => getModule().initDatabase();
export const getFolders = (parentId?: number | null) => getModule().getFolders(parentId);
export const getFolderById = (id: number) => getModule().getFolderById(id);
export const getFolderBreadcrumbs = (folderId: number) =>
  getModule().getFolderBreadcrumbs(folderId);
export const getGlobalStaleTasksCount = (): number => getModule().getGlobalStaleTasksCount();
export const createFolder = (
  name: string,
  parentId?: number | null,
  color?: string,
  description?: string
) => getModule().createFolder(name, parentId, color, description);
export const updateFolderDescription = (id: number, description: string) =>
  getModule().updateFolderDescription(id, description);
export const updateFolderDescriptionAsync = (id: number, description: string): Promise<void> =>
  getModule().updateFolderDescriptionAsync(id, description);
export const deleteFolder = (id: number) => getModule().deleteFolder(id);
export const getTasks = (folderId: number) => getModule().getTasks(folderId);
export const getDeletedTasks = (folderId?: number) => getModule().getDeletedTasks(folderId);
export const createTask = (...args: any[]) => (getModule().createTask as any)(...args);
export const updateTaskStatus = (id: number, status: any) =>
  getModule().updateTaskStatus(id, status);
export const updateTaskStatusAsync = (id: number, status: any): Promise<void> =>
  getModule().updateTaskStatusAsync(id, status);
export const createTaskAsync = (...args: any[]): Promise<number> =>
  (getModule().createTaskAsync as any)(...args);
export const deleteTaskAsync = (id: number): Promise<void> =>
  getModule().deleteTaskAsync(id);
export const deleteTask = (id: number) => getModule().deleteTask(id);
export const restoreTask = (id: number) => getModule().restoreTask(id);
export const restoreTaskAsync = (id: number): Promise<void> =>
  getModule().restoreTaskAsync(id);
export const hardDeleteTask = (id: number) => getModule().hardDeleteTask(id);
export const hardDeleteTaskAsync = (id: number): Promise<void> =>
  getModule().hardDeleteTaskAsync(id);
export const getAuditLogs = (limit?: number, taskId?: number) =>
  getModule().getAuditLogs(limit, taskId);
export const getProjectAuditLogs = (folderId: number, limit?: number, offset?: number) =>
  getModule().getProjectAuditLogs(folderId, limit, offset);
export const getProjectAuditLogsAsync = (
  folderId: number,
  limit?: number,
  offset?: number
): Promise<any[]> => getModule().getProjectAuditLogsAsync(folderId, limit, offset);

export const getMainNoteCategories = () => getModule().getMainNoteCategories();
export const getSubcategories = (parentId: string) => getModule().getSubcategories(parentId);
export const getAllNoteCategories = () => getModule().getAllNoteCategories();
export const createNoteCategory = (name: string, parentId?: string | null) =>
  getModule().createNoteCategory(name, parentId);
export const deleteNoteCategory = (id: string) => getModule().deleteNoteCategory(id);
export const getNotes = (categoryId?: string | null, isMainCategoryWithSubs?: boolean) =>
  getModule().getNotes(categoryId, isMainCategoryWithSubs);
export const getNoteById = (id: string) => getModule().getNoteById(id);
export const createNote = (...args: any[]) => (getModule().createNote as any)(...args);
export const updateNote = (...args: any[]) => (getModule().updateNote as any)(...args);
export const toggleNotePinned = (id: string) => getModule().toggleNotePinned(id);
export const deleteNote = (id: string) => getModule().deleteNote(id);
