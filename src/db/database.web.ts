import {
  Folder,
  Task,
  TaskStatus,
  TaskPriority,
  AuditLog,
} from './types';
import {
  SEED_FOLDERS_DATA,
} from './seedData';
import {
  DEFAULT_FOLDER_COLOR,
  formatDateTimeOffset,
  formatDateOnlyOffset,
  isTaskStale,
} from '../utils/dateAndTaskUtils';

export type {
  Folder,
  Task,
  TaskStatus,
  TaskPriority,
  AuditLog,
};

// -----------------------------------------------------------------------------
// Almacenamiento en Memoria / LocalStorage para Web y SSR
// -----------------------------------------------------------------------------
let inMemoryFolders: Folder[] = [];
let inMemoryTasks: Task[] = [];
let inMemoryAuditLogs: AuditLog[] = [];
let isInitialized = false;

function getNow(): string {
  return formatDateTimeOffset(0);
}

export const db = {
  execSync: (_sql: string) => {},
  runSync: (_sql: string, _params?: any[]) => ({ lastInsertRowId: 1 }),
  getFirstSync: <T>(_sql: string, _params?: any[]): T | null => null,
  getAllSync: <T>(_sql: string, _params?: any[]): T[] => [],
};

export function initDatabase(): void {
  if (isInitialized) return;
  isInitialized = true;

  // Semilla de Carpetas de Proyectos
  inMemoryFolders = SEED_FOLDERS_DATA.map((folder, index) => ({
    id: index + 1,
    name: folder.name,
    description: folder.description,
    parent_id: null,
    color: folder.color,
    icon: folder.icon,
    created_at: formatDateTimeOffset(folder.createdDaysOffset),
    updated_at: formatDateTimeOffset(folder.createdDaysOffset),
  }));

  // Semilla de Tareas Iniciales
  inMemoryTasks = [
    {
      id: 1,
      folder_id: 1,
      title: 'Configurar arquitectura SQLite y Triggers',
      description: 'Persistencia local con Expo SQLite y Soft Deletes',
      status: 'DONE',
      priority: 'HIGH',
      due_date: formatDateOnlyOffset(0),
      is_deleted: 0,
      created_at: formatDateTimeOffset(-10),
      updated_at: formatDateTimeOffset(-2),
    },
    {
      id: 2,
      folder_id: 1,
      title: 'Implementar vista de Kanban interactiva',
      description: 'Arrastre y Edge Scrolling con react-native-reanimated',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      due_date: formatDateOnlyOffset(-2),
      is_deleted: 0,
      created_at: formatDateTimeOffset(-10),
      updated_at: formatDateTimeOffset(-9), // Estancada (> 7 días)
    },
    {
      id: 3,
      folder_id: 1,
      title: 'Pruebas de navegación con Expo Router',
      description: 'Validar rutas dinámicas y Breadcrumbs en app/folder/[id]',
      status: 'TODO',
      priority: 'MEDIUM',
      due_date: formatDateOnlyOffset(3),
      is_deleted: 0,
      created_at: formatDateTimeOffset(-1),
      updated_at: formatDateTimeOffset(-1),
    },
  ];

  // Semilla de Auditoría Inicial
  inMemoryAuditLogs = [
    {
      id: 1,
      entity_type: 'TASK',
      entity_id: 1,
      folder_id: 1,
      task_id: 1,
      action: 'STATUS_CHANGE',
      old_value: JSON.stringify({
        title: 'Configurar arquitectura SQLite y Triggers',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
      }),
      new_value: JSON.stringify({
        title: 'Configurar arquitectura SQLite y Triggers',
        status: 'DONE',
        priority: 'HIGH',
      }),
      timestamp: getNow(),
    },
  ];
}

// -----------------------------------------------------------------------------
// Funciones auxiliares para emular la CTE Recursiva en Web
// -----------------------------------------------------------------------------
function getDescendantFolderIds(rootId: number): number[] {
  const descendants: number[] = [];
  const stack = [rootId];
  while (stack.length > 0) {
    const currentId = stack.pop()!;
    const children = inMemoryFolders.filter((f) => f.parent_id === currentId);
    for (const child of children) {
      descendants.push(child.id);
      stack.push(child.id);
    }
  }
  return descendants;
}

function getFolderDepth(folderId: number): number {
  let depth = 0;
  let current = inMemoryFolders.find((f) => f.id === folderId);
  while (current && current.parent_id !== null) {
    depth += 1;
    current = inMemoryFolders.find((f) => f.id === current!.parent_id);
  }
  return depth;
}

function enrichFolderWithRecursiveMetrics(f: Folder): Folder {
  const descendantIds = getDescendantFolderIds(f.id);
  const allHierarchyIds = [f.id, ...descendantIds];
  const activeHierarchyTasks = inMemoryTasks.filter(
    (t) => allHierarchyIds.includes(t.folder_id) && (t.is_deleted ?? 0) === 0
  );
  return {
    ...f,
    depth: getFolderDepth(f.id),
    task_count: activeHierarchyTasks.length,
    stale_task_count: activeHierarchyTasks.filter(isTaskStale).length,
    subfolder_count: descendantIds.length,
  };
}

// -----------------------------------------------------------------------------
// Operaciones de Proyectos / Folders & Tasks
// -----------------------------------------------------------------------------
export function getFolders(parentId: number | null = null): Folder[] {
  initDatabase();
  return inMemoryFolders
    .filter((f) => f.parent_id === parentId)
    .map(enrichFolderWithRecursiveMetrics)
    .reverse();
}

export function getFolderById(id: number): Folder | null {
  initDatabase();
  const f = inMemoryFolders.find((item) => item.id === id);
  if (!f) return null;
  return enrichFolderWithRecursiveMetrics(f);
}

export function getFolderBreadcrumbs(folderId: number): Folder[] {
  initDatabase();
  const path: Folder[] = [];
  let current = inMemoryFolders.find((f) => f.id === folderId);
  while (current) {
    path.unshift(current);
    current =
      current.parent_id !== null
        ? inMemoryFolders.find((f) => f.id === current!.parent_id)
        : undefined;
  }
  return path;
}

export function getGlobalStaleTasksCount(): number {
  initDatabase();
  return inMemoryTasks.filter(isTaskStale).length;
}

export function createFolder(
  name: string,
  parentId: number | null = null,
  color?: string,
  description = ''
): number {
  initDatabase();
  let resolvedColor = color;
  if (!resolvedColor && parentId !== null) {
    const parentFolder = inMemoryFolders.find((f) => f.id === parentId);
    resolvedColor = parentFolder?.color || DEFAULT_FOLDER_COLOR;
  }
  const finalColor = resolvedColor || DEFAULT_FOLDER_COLOR;

  const id = inMemoryFolders.length > 0 ? Math.max(...inMemoryFolders.map((f) => f.id)) + 1 : 1;
  const newFolder: Folder = {
    id,
    name,
    description,
    parent_id: parentId,
    color: finalColor,
    icon: 'folder',
    created_at: getNow(),
    updated_at: getNow(),
  };
  inMemoryFolders.push(newFolder);
  inMemoryAuditLogs.unshift({
    id: inMemoryAuditLogs.length + 1,
    entity_type: 'FOLDER',
    entity_id: id,
    folder_id: id,
    task_id: null,
    action: 'CREATE',
    old_value: null,
    new_value: JSON.stringify({ name, parent_id: parentId, color: finalColor, description }),
    timestamp: getNow(),
  });
  return id;
}

export function updateFolderDescription(id: number, description: string): void {
  initDatabase();
  const folder = inMemoryFolders.find((f) => f.id === id);
  if (folder) {
    const oldDesc = folder.description || '';
    folder.description = description;
    folder.updated_at = getNow();
    inMemoryAuditLogs.unshift({
      id: inMemoryAuditLogs.length + 1,
      entity_type: 'FOLDER',
      entity_id: id,
      folder_id: id,
      task_id: null,
      action: 'UPDATE',
      old_value: JSON.stringify({ name: folder.name, description: oldDesc }),
      new_value: JSON.stringify({ name: folder.name, description }),
      timestamp: getNow(),
    });
  }
}

export async function updateFolderDescriptionAsync(
  id: number,
  description: string
): Promise<void> {
  updateFolderDescription(id, description);
}

export function deleteFolder(id: number): void {
  initDatabase();
  const existing = inMemoryFolders.find((f) => f.id === id);
  if (existing) {
    inMemoryAuditLogs.unshift({
      id: inMemoryAuditLogs.length + 1,
      entity_type: 'FOLDER',
      entity_id: id,
      folder_id: id,
      task_id: null,
      action: 'DELETE',
      old_value: JSON.stringify({ name: existing.name }),
      new_value: null,
      timestamp: getNow(),
    });
  }
  const toRemove = new Set([id, ...getDescendantFolderIds(id)]);
  inMemoryFolders = inMemoryFolders.filter((f) => !toRemove.has(f.id));
  inMemoryTasks = inMemoryTasks.filter((t) => !toRemove.has(t.folder_id));
}

export function getTasks(folderId: number): Task[] {
  initDatabase();
  return inMemoryTasks
    .filter((t) => t.folder_id === folderId && (t.is_deleted ?? 0) === 0)
    .reverse();
}

export function getDeletedTasks(folderId?: number): Task[] {
  initDatabase();
  return inMemoryTasks
    .filter(
      (t) =>
        (t.is_deleted ?? 0) === 1 && (folderId === undefined || t.folder_id === folderId)
    )
    .reverse();
}

export function createTask(
  folderId: number,
  title: string,
  description = '',
  status: TaskStatus = 'TODO',
  priority: TaskPriority = 'MEDIUM',
  dueDate: string | null = null
): number {
  initDatabase();
  const id = inMemoryTasks.length > 0 ? Math.max(...inMemoryTasks.map((t) => t.id)) + 1 : 1;
  const newTask: Task = {
    id,
    folder_id: folderId,
    title,
    description,
    status,
    priority,
    due_date: dueDate,
    is_deleted: 0,
    created_at: getNow(),
    updated_at: getNow(),
  };
  inMemoryTasks.push(newTask);
  inMemoryAuditLogs.unshift({
    id: inMemoryAuditLogs.length + 1,
    entity_type: 'TASK',
    entity_id: id,
    folder_id: folderId,
    task_id: id,
    action: 'CREATE',
    old_value: null,
    new_value: JSON.stringify({
      title,
      status,
      priority,
      folder_id: folderId,
      due_date: dueDate,
      is_deleted: 0,
    }),
    timestamp: getNow(),
  });
  return id;
}

export function updateTaskStatus(id: number, status: TaskStatus): void {
  initDatabase();
  const task = inMemoryTasks.find((t) => t.id === id);
  if (task) {
    const oldStatus = task.status;
    task.status = status;
    task.updated_at = getNow();
    inMemoryAuditLogs.unshift({
      id: inMemoryAuditLogs.length + 1,
      entity_type: 'TASK',
      entity_id: id,
      folder_id: task.folder_id,
      task_id: id,
      action: oldStatus !== status ? 'STATUS_CHANGE' : 'UPDATE',
      old_value: JSON.stringify({
        title: task.title,
        status: oldStatus,
        priority: task.priority,
      }),
      new_value: JSON.stringify({
        title: task.title,
        status,
        priority: task.priority,
      }),
      timestamp: getNow(),
    });
  }
}

export async function updateTaskStatusAsync(id: number, status: TaskStatus): Promise<void> {
  updateTaskStatus(id, status);
}

export async function createTaskAsync(
  folderId: number,
  title: string,
  description = '',
  status: TaskStatus = 'TODO',
  priority: TaskPriority = 'MEDIUM',
  dueDate: string | null = null
): Promise<number> {
  return createTask(folderId, title, description, status, priority, dueDate);
}

export async function deleteTaskAsync(id: number): Promise<void> {
  deleteTask(id);
}

export function deleteTask(id: number): void {
  initDatabase();
  const task = inMemoryTasks.find((t) => t.id === id);
  if (task && (task.is_deleted ?? 0) === 0) {
    task.is_deleted = 1;
    task.updated_at = getNow();
    inMemoryAuditLogs.unshift({
      id: inMemoryAuditLogs.length + 1,
      entity_type: 'TASK',
      entity_id: id,
      folder_id: task.folder_id,
      task_id: id,
      action: 'SOFT_DELETE',
      old_value: JSON.stringify({
        title: task.title,
        status: task.status,
        priority: task.priority,
        is_deleted: 0,
      }),
      new_value: JSON.stringify({
        title: task.title,
        status: task.status,
        priority: task.priority,
        is_deleted: 1,
      }),
      timestamp: getNow(),
    });
  }
}

export function restoreTask(id: number): void {
  initDatabase();
  const task = inMemoryTasks.find((t) => t.id === id);
  if (task && (task.is_deleted ?? 0) === 1) {
    task.is_deleted = 0;
    task.updated_at = getNow();
    inMemoryAuditLogs.unshift({
      id: inMemoryAuditLogs.length + 1,
      entity_type: 'TASK',
      entity_id: id,
      folder_id: task.folder_id,
      task_id: id,
      action: 'RESTORE',
      old_value: JSON.stringify({
        title: task.title,
        status: task.status,
        priority: task.priority,
        is_deleted: 1,
      }),
      new_value: JSON.stringify({
        title: task.title,
        status: task.status,
        priority: task.priority,
        is_deleted: 0,
      }),
      timestamp: getNow(),
    });
  }
}

export async function restoreTaskAsync(id: number): Promise<void> {
  restoreTask(id);
}

export function hardDeleteTask(id: number): void {
  initDatabase();
  const task = inMemoryTasks.find((t) => t.id === id);
  if (task) {
    inMemoryAuditLogs.unshift({
      id: inMemoryAuditLogs.length + 1,
      entity_type: 'TASK',
      entity_id: id,
      folder_id: task.folder_id,
      task_id: id,
      action: 'DELETE',
      old_value: JSON.stringify({
        title: task.title,
        status: task.status,
        priority: task.priority,
      }),
      new_value: null,
      timestamp: getNow(),
    });
  }
  inMemoryTasks = inMemoryTasks.filter((t) => t.id !== id);
}

export async function hardDeleteTaskAsync(id: number): Promise<void> {
  hardDeleteTask(id);
}

export function getAuditLogs(limit = 50, taskId?: number): AuditLog[] {
  initDatabase();
  const logs =
    taskId !== undefined
      ? inMemoryAuditLogs.filter((l) => l.task_id === taskId)
      : inMemoryAuditLogs;
  return logs.slice(0, limit);
}

export function getProjectAuditLogs(folderId: number, limit = 20, offset = 0): AuditLog[] {
  initDatabase();
  return inMemoryAuditLogs
    .filter((l) => l.folder_id === folderId)
    .slice(offset, offset + limit);
}

export async function getProjectAuditLogsAsync(
  folderId: number,
  limit = 20,
  offset = 0
): Promise<AuditLog[]> {
  return getProjectAuditLogs(folderId, limit, offset);
}
