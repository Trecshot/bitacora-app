import {
  Folder,
  Task,
  TaskStatus,
  TaskPriority,
  AuditLog,
  NoteCategory,
  Tag,
  NoteTag,
  Note,
  SearchNotesOptions,
} from './types';
import {
  generateUUID,
  SEED_FOLDERS_DATA,
  SEED_TAGS_DATA,
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
  NoteCategory,
  Tag,
  NoteTag,
  Note,
  SearchNotesOptions,
};
export { generateUUID };

// -----------------------------------------------------------------------------
// Almacenamiento en Memoria / LocalStorage para Web y SSR
// -----------------------------------------------------------------------------
let inMemoryFolders: Folder[] = [];
let inMemoryTasks: Task[] = [];
let inMemoryAuditLogs: AuditLog[] = [];
let inMemoryCategories: NoteCategory[] = [];
let inMemoryNotes: Note[] = [];
let inMemoryTags: Tag[] = [];
let inMemoryNoteTags: NoteTag[] = [];
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

  // Semilla de Proyectos
  inMemoryFolders = SEED_FOLDERS_DATA.map((seed, index) => ({
    id: index + 1,
    name: seed.name,
    description: seed.description,
    parent_id: null,
    color: seed.color,
    icon: seed.icon,
    created_at: formatDateTimeOffset(seed.createdDaysOffset),
    updated_at: getNow(),
  }));

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
      created_at: formatDateTimeOffset(-4),
      updated_at: getNow(),
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
      updated_at: formatDateTimeOffset(-9),
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

  inMemoryAuditLogs = [
    {
      id: 1,
      entity_type: 'FOLDER',
      entity_id: 1,
      folder_id: 1,
      task_id: null,
      action: 'CREATE',
      old_value: null,
      new_value: JSON.stringify({ name: 'Proyecto Principal', parent_id: null }),
      timestamp: formatDateTimeOffset(-5),
    },
    {
      id: 2,
      entity_type: 'TASK',
      entity_id: 3,
      folder_id: 1,
      task_id: 3,
      action: 'CREATE',
      old_value: null,
      new_value: JSON.stringify({
        title: 'Pruebas de navegación con Expo Router',
        status: 'TODO',
        priority: 'MEDIUM',
        folder_id: 1,
      }),
      timestamp: formatDateTimeOffset(-1),
    },
    {
      id: 3,
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

  // Semilla de Notas y Categorías
  const seriesId = generateUUID();
  const personalId = generateUUID();
  const ideasId = generateUUID();

  const seriesAnimadasId = generateUUID();
  const seriesNormalesId = generateUUID();

  inMemoryCategories = [
    { id: seriesId, parent_id: null, name: 'Series', created_at: getNow() },
    { id: personalId, parent_id: null, name: 'Personal', created_at: getNow() },
    { id: ideasId, parent_id: null, name: 'Ideas', created_at: getNow() },
    { id: seriesAnimadasId, parent_id: seriesId, name: 'Series Animadas', created_at: getNow() },
    { id: seriesNormalesId, parent_id: seriesId, name: 'Series Normales', created_at: getNow() },
  ];

  inMemoryNotes = [
    {
      id: generateUUID(),
      category_id: seriesAnimadasId,
      category_name: 'Series Animadas',
      title: '⭐ Series Animadas Pendientes',
      content:
        '• Arcane: Temporada 2\n• Invincible\n• Cyberpunk: Edgerunners\n• Castlevania: Nocturne',
      is_pinned: 1,
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: generateUUID(),
      category_id: seriesNormalesId,
      category_name: 'Series Normales',
      title: 'Series Live Action Recomendadas',
      content: '• Severance (Temporada 2)\n• Shōgun\n• The Bear',
      is_pinned: 0,
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: generateUUID(),
      category_id: personalId,
      category_name: 'Personal',
      title: '⭐ Recordatorios Personales',
      content:
        '• Revisar entrega de proyecto de Bitácora\n• Comprar insumos de trabajo\n• Programar copia de seguridad',
      is_pinned: 1,
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: generateUUID(),
      category_id: ideasId,
      category_name: 'Ideas',
      title: 'Ideas de Diseño UI',
      content:
        'Cuadrícula asimétrica Masonry para notas, pestañas tipo píldora horizontales y selector de subcategorías dinámico.',
      is_pinned: 0,
      created_at: getNow(),
      updated_at: getNow(),
    },
  ];

  // Semilla de Etiquetas (Tags) y relaciones Note_Tags
  inMemoryTags = SEED_TAGS_DATA.map((t) => ({
    id: generateUUID(),
    name: t.name,
    color: t.color,
    created_at: getNow(),
  }));

  if (inMemoryNotes.length >= 2 && inMemoryTags.length >= 5) {
    const [tagUrgente, tagTrabajo, tagIdeas, , tagPersonal] = inMemoryTags;
    inMemoryNoteTags = [
      { note_id: inMemoryNotes[0].id, tag_id: tagIdeas.id, created_at: getNow() },
      { note_id: inMemoryNotes[0].id, tag_id: tagPersonal.id, created_at: getNow() },
      { note_id: inMemoryNotes[1].id, tag_id: tagTrabajo.id, created_at: getNow() },
    ];
    if (inMemoryNotes.length >= 3) {
      inMemoryNoteTags.push(
        { note_id: inMemoryNotes[2].id, tag_id: tagUrgente.id, created_at: getNow() },
        { note_id: inMemoryNotes[2].id, tag_id: tagPersonal.id, created_at: getNow() }
      );
    }
  }
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

// -----------------------------------------------------------------------------
// Operaciones del Módulo de Notas
// -----------------------------------------------------------------------------

export function getMainNoteCategories(): NoteCategory[] {
  initDatabase();
  return inMemoryCategories
    .filter((c) => c.parent_id === null)
    .map((c) => ({
      ...c,
      subcategories_count: inMemoryCategories.filter((sub) => sub.parent_id === c.id).length,
      notes_count: inMemoryNotes.filter((n) => {
        const subIds = inMemoryCategories
          .filter((sub) => sub.parent_id === c.id)
          .map((sub) => sub.id);
        return n.category_id === c.id || subIds.includes(n.category_id);
      }).length,
    }));
}

export function getSubcategories(parentId: string): NoteCategory[] {
  initDatabase();
  return inMemoryCategories
    .filter((c) => c.parent_id === parentId)
    .map((c) => ({
      ...c,
      subcategories_count: 0,
      notes_count: inMemoryNotes.filter((n) => n.category_id === c.id).length,
    }));
}

export function getAllNoteCategories(): NoteCategory[] {
  initDatabase();
  return inMemoryCategories.map((c) => ({
    ...c,
    subcategories_count: inMemoryCategories.filter((sub) => sub.parent_id === c.id).length,
    notes_count: inMemoryNotes.filter((n) => n.category_id === c.id).length,
  }));
}

export function createNoteCategory(name: string, parentId: string | null = null): string {
  initDatabase();
  const id = generateUUID();
  inMemoryCategories.push({
    id,
    parent_id: parentId,
    name,
    created_at: getNow(),
  });
  return id;
}

export function deleteNoteCategory(id: string): void {
  initDatabase();
  const subIds = inMemoryCategories.filter((c) => c.parent_id === id).map((c) => c.id);
  const targetIds = [id, ...subIds];
  inMemoryCategories = inMemoryCategories.filter((c) => !targetIds.includes(c.id));
  inMemoryNotes = inMemoryNotes.filter((n) => !targetIds.includes(n.category_id));
}

export function getAllTags(): Tag[] {
  initDatabase();
  return [...inMemoryTags].sort((a, b) => a.name.localeCompare(b.name));
}

export function createTag(name: string, color = DEFAULT_FOLDER_COLOR): Tag {
  initDatabase();
  const trimmed = name.trim();
  const existing = inMemoryTags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;

  const newTag: Tag = {
    id: generateUUID(),
    name: trimmed,
    color,
    created_at: getNow(),
  };
  inMemoryTags.push(newTag);
  return newTag;
}

export function deleteTag(id: string): void {
  initDatabase();
  inMemoryTags = inMemoryTags.filter((t) => t.id !== id);
  inMemoryNoteTags = inMemoryNoteTags.filter((nt) => nt.tag_id !== id);
}

export function getNoteTags(noteId: string): Tag[] {
  initDatabase();
  const tagIds = inMemoryNoteTags.filter((nt) => nt.note_id === noteId).map((nt) => nt.tag_id);
  return inMemoryTags.filter((t) => tagIds.includes(t.id));
}

export function setNoteTags(noteId: string, tagIds: string[]): void {
  initDatabase();
  inMemoryNoteTags = inMemoryNoteTags.filter((nt) => nt.note_id !== noteId);
  for (const tagId of tagIds) {
    inMemoryNoteTags.push({ note_id: noteId, tag_id: tagId, created_at: getNow() });
  }
}

export async function setNoteTagsAsync(noteId: string, tagIds: string[]): Promise<void> {
  setNoteTags(noteId, tagIds);
}

export function getNotesByTag(tagId: string): Note[] {
  return getNotes(null, false, tagId);
}

function enrichNoteWithTags(note: Note): Note {
  const noteTagIds = inMemoryNoteTags
    .filter((nt) => nt.note_id === note.id)
    .map((nt) => nt.tag_id);
  const tags = inMemoryTags.filter((t) => noteTagIds.includes(t.id));
  return {
    ...note,
    tags,
  };
}

export function getNotes(
  categoryId?: string | null,
  isMainCategoryWithSubs = false,
  tagId?: string | null
): Note[] {
  initDatabase();
  let filtered = [...inMemoryNotes];

  if (tagId) {
    const matchingNoteIds = inMemoryNoteTags
      .filter((nt) => nt.tag_id === tagId)
      .map((nt) => nt.note_id);
    filtered = filtered.filter((n) => matchingNoteIds.includes(n.id));
  }

  if (categoryId && categoryId !== 'ALL') {
    if (isMainCategoryWithSubs) {
      const subIds = inMemoryCategories
        .filter((c) => c.parent_id === categoryId)
        .map((c) => c.id);
      filtered = filtered.filter(
        (n) => n.category_id === categoryId || subIds.includes(n.category_id)
      );
    } else {
      filtered = filtered.filter((n) => n.category_id === categoryId);
    }
  }

  return filtered
    .map(enrichNoteWithTags)
    .sort((a, b) => {
      if (b.is_pinned !== a.is_pinned) {
        return b.is_pinned - a.is_pinned;
      }
      return (b.updated_at || '').localeCompare(a.updated_at || '');
    });
}

export function searchNotes(query: string, options?: SearchNotesOptions): Note[] {
  initDatabase();
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return getNotes(options?.categoryId, options?.isMainCategoryWithSubs, options?.tagId);
  }

  const candidates = getNotes(
    options?.categoryId,
    options?.isMainCategoryWithSubs,
    options?.tagId
  );
  const tokens = trimmed.split(/\s+/).filter(Boolean);

  return candidates.filter((n) => {
    const title = (n.title || '').toLowerCase();
    const content = (n.content || '').toLowerCase();
    // Emulación de FTS5 MATCH con operadores de prefijo / token
    return tokens.every((token) => title.includes(token) || content.includes(token));
  });
}

export async function searchNotesAsync(
  query: string,
  options?: SearchNotesOptions
): Promise<Note[]> {
  return searchNotes(query, options);
}

export function getNoteById(id: string): Note | null {
  initDatabase();
  const note = inMemoryNotes.find((n) => n.id === id);
  if (!note) return null;
  return enrichNoteWithTags(note);
}

export function createNote(
  categoryId: string,
  title: string,
  content = '',
  isPinned = false,
  presetId?: string
): string {
  initDatabase();
  const id = presetId || generateUUID();
  const category = inMemoryCategories.find((c) => c.id === categoryId);
  const newNote: Note = {
    id,
    category_id: categoryId,
    category_name: category?.name,
    title,
    content,
    is_pinned: isPinned ? 1 : 0,
    created_at: getNow(),
    updated_at: getNow(),
    tags: [],
  };
  inMemoryNotes.push(newNote);
  return id;
}

export async function createNoteAsync(
  categoryId: string,
  title: string,
  content = '',
  isPinned = false,
  presetId?: string
): Promise<string> {
  return createNote(categoryId, title, content, isPinned, presetId);
}

export function updateNote(
  id: string,
  title: string,
  content: string,
  categoryId?: string,
  isPinned?: boolean
): void {
  initDatabase();
  const note = inMemoryNotes.find((n) => n.id === id);
  if (note) {
    note.title = title;
    note.content = content;
    note.updated_at = getNow();
    if (categoryId !== undefined) {
      note.category_id = categoryId;
      const category = inMemoryCategories.find((c) => c.id === categoryId);
      note.category_name = category?.name;
    }
    if (isPinned !== undefined) {
      note.is_pinned = isPinned ? 1 : 0;
    }
  }
}

export async function updateNoteAsync(
  id: string,
  title: string,
  content: string,
  categoryId?: string,
  isPinned?: boolean
): Promise<void> {
  updateNote(id, title, content, categoryId, isPinned);
}

export function toggleNotePinned(id: string): void {
  initDatabase();
  const note = inMemoryNotes.find((n) => n.id === id);
  if (note) {
    note.is_pinned = note.is_pinned === 1 ? 0 : 1;
    note.updated_at = getNow();
  }
}

export function deleteNote(id: string): void {
  initDatabase();
  inMemoryNotes = inMemoryNotes.filter((n) => n.id !== id);
  inMemoryNoteTags = inMemoryNoteTags.filter((nt) => nt.note_id !== id);
}
