import { Platform } from 'react-native';
import type {
  Folder,
  Task,
  TaskStatus,
  TaskPriority,
  AuditAction,
  AuditLog,
  NoteCategory,
  Tag,
  NoteTag,
  Note,
  SearchNotesOptions,
} from './types';

// Exportación de tipos TypeScript centralizados (costo cero en tiempo de ejecución)
export type {
  Folder,
  Task,
  TaskStatus,
  TaskPriority,
  AuditAction,
  AuditLog,
  NoteCategory,
  Tag,
  NoteTag,
  Note,
  SearchNotesOptions,
};

export { generateUUID } from './seedData';

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

export const getMainNoteCategories = (): NoteCategory[] =>
  getModule().getMainNoteCategories();

export const getSubcategories = (parentId: string): NoteCategory[] =>
  getModule().getSubcategories(parentId);

export const getAllNoteCategories = (): NoteCategory[] =>
  getModule().getAllNoteCategories();

export const createNoteCategory = (
  name: string,
  parentId?: string | null
): string => getModule().createNoteCategory(name, parentId);

export const deleteNoteCategory = (id: string): void =>
  getModule().deleteNoteCategory(id);

export const getNotes = (
  categoryId?: string | null,
  isMainCategoryWithSubs?: boolean,
  tagId?: string | null
): Note[] => getModule().getNotes(categoryId, isMainCategoryWithSubs, tagId);

export const searchNotes = (
  query: string,
  options?: SearchNotesOptions
): Note[] => getModule().searchNotes(query, options);

export const searchNotesAsync = (
  query: string,
  options?: SearchNotesOptions
): Promise<Note[]> => getModule().searchNotesAsync(query, options);

export const getNoteById = (id: string): Note | null =>
  getModule().getNoteById(id);

export const createNote = (
  categoryId: string,
  title: string,
  content?: string,
  isPinned?: boolean,
  presetId?: string
): string =>
  getModule().createNote(categoryId, title, content, isPinned, presetId);

export const createNoteAsync = (
  categoryId: string,
  title: string,
  content?: string,
  isPinned?: boolean,
  presetId?: string
): Promise<string> =>
  getModule().createNoteAsync(categoryId, title, content, isPinned, presetId);

export const updateNote = (
  id: string,
  title: string,
  content: string,
  categoryId?: string,
  isPinned?: boolean
): void => getModule().updateNote(id, title, content, categoryId, isPinned);

export const updateNoteAsync = (
  id: string,
  title: string,
  content: string,
  categoryId?: string,
  isPinned?: boolean
): Promise<void> =>
  getModule().updateNoteAsync(id, title, content, categoryId, isPinned);

export const toggleNotePinned = (id: string): void =>
  getModule().toggleNotePinned(id);

export const deleteNote = (id: string): void => getModule().deleteNote(id);

export const getAllTags = (): Tag[] => getModule().getAllTags();

export const createTag = (name: string, color?: string): Tag =>
  getModule().createTag(name, color);

export const deleteTag = (id: string): void => getModule().deleteTag(id);

export const getNoteTags = (noteId: string): Tag[] =>
  getModule().getNoteTags(noteId);

export const setNoteTags = (noteId: string, tagIds: string[]): void =>
  getModule().setNoteTags(noteId, tagIds);

export const setNoteTagsAsync = (
  noteId: string,
  tagIds: string[]
): Promise<void> => getModule().setNoteTagsAsync(noteId, tagIds);

export const getNotesByTag = (tagId: string): Note[] =>
  getModule().getNotesByTag(tagId);
