import * as SQLite from 'expo-sqlite';

// Generador de UUID v4 estándar para Note_Categories y Notes
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// -----------------------------------------------------------------------------
// Interfaces del Módulo de Proyectos (Kanban & Folders)
// -----------------------------------------------------------------------------
export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  color?: string;
  icon?: string;
  created_at?: string;
  updated_at?: string;
  task_count?: number;
  subfolder_count?: number;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: number;
  folder_id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuditLog {
  id: number;
  entity_type: 'FOLDER' | 'TASK';
  entity_id: number;
  action: 'CREATE' | 'UPDATE' | 'STATUS_CHANGE' | 'DELETE';
  old_value: string | null;
  new_value: string | null;
  timestamp: string;
}

// -----------------------------------------------------------------------------
// Interfaces del Módulo de Notas (Esquema Independiente SQLite)
// -----------------------------------------------------------------------------
export interface NoteCategory {
  id: string; // UUID
  parent_id: string | null; // UUID (Foreign Key, Nullable)
  name: string;
  created_at?: string;
  subcategories_count?: number;
  notes_count?: number;
}

export interface Note {
  id: string; // UUID
  category_id: string; // UUID (Foreign Key)
  category_name?: string;
  title: string;
  content: string;
  is_pinned: number; // 0 o 1
  created_at?: string;
  updated_at?: string;
}

// Instanciar la conexión sincrónica según la arquitectura requerida
export const db = SQLite.openDatabaseSync('bitacora.db');

/**
 * Función de migración inicial:
 * Crea las tablas de Proyectos (Folders, Tasks, Audit_Logs) con sus triggers
 * y las tablas independientes de Notas (Note_Categories, Notes) sin colisiones.
 */
export function initDatabase(): void {
  // Activar claves foráneas
  db.execSync('PRAGMA foreign_keys = ON;');

  // Migración de Tablas de Proyectos
  db.execSync(`
    CREATE TABLE IF NOT EXISTS Folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER DEFAULT NULL,
      color TEXT DEFAULT '#3B82F6',
      icon TEXT DEFAULT 'folder',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (parent_id) REFERENCES Folders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'TODO',
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      due_date TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (folder_id) REFERENCES Folders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Audit_Logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      old_value TEXT DEFAULT NULL,
      new_value TEXT DEFAULT NULL,
      timestamp TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Triggers de Auditoría para Tasks
  db.execSync(`
    CREATE TRIGGER IF NOT EXISTS trg_tasks_insert
    AFTER INSERT ON Tasks
    BEGIN
      INSERT INTO Audit_Logs (entity_type, entity_id, action, old_value, new_value, timestamp)
      VALUES (
        'TASK',
        NEW.id,
        'CREATE',
        NULL,
        json_object('title', NEW.title, 'status', NEW.status, 'folder_id', NEW.folder_id),
        datetime('now', 'localtime')
      );
    END;

    CREATE TRIGGER IF NOT EXISTS trg_tasks_update
    AFTER UPDATE ON Tasks
    BEGIN
      INSERT INTO Audit_Logs (entity_type, entity_id, action, old_value, new_value, timestamp)
      VALUES (
        'TASK',
        NEW.id,
        CASE 
          WHEN OLD.status <> NEW.status THEN 'STATUS_CHANGE'
          ELSE 'UPDATE'
        END,
        json_object('title', OLD.title, 'status', OLD.status, 'priority', OLD.priority),
        json_object('title', NEW.title, 'status', NEW.status, 'priority', NEW.priority),
        datetime('now', 'localtime')
      );
    END;

    CREATE TRIGGER IF NOT EXISTS trg_tasks_delete
    AFTER DELETE ON Tasks
    BEGIN
      INSERT INTO Audit_Logs (entity_type, entity_id, action, old_value, new_value, timestamp)
      VALUES (
        'TASK',
        OLD.id,
        'DELETE',
        json_object('title', OLD.title, 'status', OLD.status, 'folder_id', OLD.folder_id),
        NULL,
        datetime('now', 'localtime')
      );
    END;
  `);

  // Triggers de Auditoría para Folders
  db.execSync(`
    CREATE TRIGGER IF NOT EXISTS trg_folders_insert
    AFTER INSERT ON Folders
    BEGIN
      INSERT INTO Audit_Logs (entity_type, entity_id, action, old_value, new_value, timestamp)
      VALUES (
        'FOLDER',
        NEW.id,
        'CREATE',
        NULL,
        json_object('name', NEW.name, 'parent_id', NEW.parent_id),
        datetime('now', 'localtime')
      );
    END;

    CREATE TRIGGER IF NOT EXISTS trg_folders_update
    AFTER UPDATE ON Folders
    BEGIN
      INSERT INTO Audit_Logs (entity_type, entity_id, action, old_value, new_value, timestamp)
      VALUES (
        'FOLDER',
        NEW.id,
        'UPDATE',
        json_object('name', OLD.name),
        json_object('name', NEW.name),
        datetime('now', 'localtime')
      );
    END;

    CREATE TRIGGER IF NOT EXISTS trg_folders_delete
    AFTER DELETE ON Folders
    BEGIN
      INSERT INTO Audit_Logs (entity_type, entity_id, action, old_value, new_value, timestamp)
      VALUES (
        'FOLDER',
        OLD.id,
        'DELETE',
        json_object('name', OLD.name),
        NULL,
        datetime('now', 'localtime')
      );
    END;
  `);

  // Migración del Esquema Independiente para Notas (Note_Categories & Notes)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS Note_Categories (
      id TEXT PRIMARY KEY,
      parent_id TEXT DEFAULT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (parent_id) REFERENCES Note_Categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Notes (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (category_id) REFERENCES Note_Categories(id) ON DELETE CASCADE
    );
  `);

  // Datos de muestra iniciales
  seedProjectDataIfEmpty();
  seedNoteDataIfEmpty();
}

function seedProjectDataIfEmpty(): void {
  const countRow = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Folders;');
  if (!countRow || countRow.count === 0) {
    db.runSync(
      `INSERT INTO Folders (name, color, icon) VALUES (?, ?, ?);`,
      ['Proyecto Principal', '#3B82F6', 'folder-kanban']
    );
    db.runSync(
      `INSERT INTO Folders (name, color, icon) VALUES (?, ?, ?);`,
      ['Documentación & Notas', '#10B981', 'book-open']
    );
    db.runSync(
      `INSERT INTO Folders (name, color, icon) VALUES (?, ?, ?);`,
      ['Diseño UI/UX', '#8B5CF6', 'palette']
    );

    // Tareas iniciales para la carpeta 1
    db.runSync(
      `INSERT INTO Tasks (folder_id, title, description, status, priority) VALUES (?, ?, ?, ?, ?);`,
      [1, 'Configurar arquitectura SQLite y Triggers', 'Persistencia local con Expo SQLite v58', 'DONE', 'HIGH']
    );
    db.runSync(
      `INSERT INTO Tasks (folder_id, title, description, status, priority) VALUES (?, ?, ?, ?, ?);`,
      [1, 'Implementar vista de Kanban interactiva', 'Arrastre y gestos con react-native-reanimated', 'IN_PROGRESS', 'HIGH']
    );
    db.runSync(
      `INSERT INTO Tasks (folder_id, title, description, status, priority) VALUES (?, ?, ?, ?, ?);`,
      [1, 'Pruebas de navegación con Expo Router', 'Validar rutas dinámicas en app/folder/[id]', 'TODO', 'MEDIUM']
    );
  }
}

function seedNoteDataIfEmpty(): void {
  const countRow = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Note_Categories;');
  if (!countRow || countRow.count === 0) {
    // Categorías principales (parent_id IS NULL)
    const seriesId = generateUUID();
    const personalId = generateUUID();
    const ideasId = generateUUID();

    db.runSync(`INSERT INTO Note_Categories (id, parent_id, name) VALUES (?, NULL, ?);`, [seriesId, 'Series']);
    db.runSync(`INSERT INTO Note_Categories (id, parent_id, name) VALUES (?, NULL, ?);`, [personalId, 'Personal']);
    db.runSync(`INSERT INTO Note_Categories (id, parent_id, name) VALUES (?, NULL, ?);`, [ideasId, 'Ideas']);

    // Subcategorías (Nivel 2) de "Series"
    const seriesAnimadasId = generateUUID();
    const seriesNormalesId = generateUUID();

    db.runSync(`INSERT INTO Note_Categories (id, parent_id, name) VALUES (?, ?, ?);`, [seriesAnimadasId, seriesId, 'Series Animadas']);
    db.runSync(`INSERT INTO Note_Categories (id, parent_id, name) VALUES (?, ?, ?);`, [seriesNormalesId, seriesId, 'Series Normales']);

    // Notas de muestra demostrando la prioridad de is_pinned DESC
    db.runSync(
      `INSERT INTO Notes (id, category_id, title, content, is_pinned) VALUES (?, ?, ?, ?, ?);`,
      [
        generateUUID(),
        seriesAnimadasId,
        '⭐ Series Animadas Pendientes',
        '• Arcane: Temporada 2\n• Invincible\n• Cyberpunk: Edgerunners\n• Castlevania: Nocturne',
        1, // Fijada
      ]
    );

    db.runSync(
      `INSERT INTO Notes (id, category_id, title, content, is_pinned) VALUES (?, ?, ?, ?, ?);`,
      [
        generateUUID(),
        seriesNormalesId,
        'Series Live Action Recomendadas',
        '• Severance (Temporada 2)\n• Shōgun\n• The Bear',
        0, // No fijada
      ]
    );

    db.runSync(
      `INSERT INTO Notes (id, category_id, title, content, is_pinned) VALUES (?, ?, ?, ?, ?);`,
      [
        generateUUID(),
        personalId,
        '⭐ Recordatorios Personales',
        '• Revisar entrega de proyecto de Bitácora\n• Comprar insumos de trabajo\n• Programar copia de seguridad',
        1, // Fijada
      ]
    );

    db.runSync(
      `INSERT INTO Notes (id, category_id, title, content, is_pinned) VALUES (?, ?, ?, ?, ?);`,
      [
        generateUUID(),
        ideasId,
        'Ideas de Diseño UI',
        'Cuadrícula asimétrica Masonry para notas, pestañas tipo píldora horizontales y selector de subcategorías dinámico.',
        0, // No fijada
      ]
    );
  }
}

// -----------------------------------------------------------------------------
// Operaciones de Proyectos / Folders & Tasks
// -----------------------------------------------------------------------------
export function getFolders(parentId: number | null = null): Folder[] {
  const query = parentId === null
    ? `
      SELECT 
        f.*,
        (SELECT COUNT(*) FROM Tasks t WHERE t.folder_id = f.id) AS task_count,
        (SELECT COUNT(*) FROM Folders sub WHERE sub.parent_id = f.id) AS subfolder_count
      FROM Folders f
      WHERE f.parent_id IS NULL
      ORDER BY f.id DESC;
    `
    : `
      SELECT 
        f.*,
        (SELECT COUNT(*) FROM Tasks t WHERE t.folder_id = f.id) AS task_count,
        (SELECT COUNT(*) FROM Folders sub WHERE sub.parent_id = f.id) AS subfolder_count
      FROM Folders f
      WHERE f.parent_id = ?
      ORDER BY f.id DESC;
    `;

  return parentId === null
    ? db.getAllSync<Folder>(query)
    : db.getAllSync<Folder>(query, [parentId]);
}

export function getFolderById(id: number): Folder | null {
  return db.getFirstSync<Folder>(`
    SELECT 
      f.*,
      (SELECT COUNT(*) FROM Tasks t WHERE t.folder_id = f.id) AS task_count,
      (SELECT COUNT(*) FROM Folders sub WHERE sub.parent_id = f.id) AS subfolder_count
    FROM Folders f
    WHERE f.id = ?;
  `, [id]);
}

export function createFolder(name: string, parentId: number | null = null, color = '#3B82F6'): number {
  const result = db.runSync(
    'INSERT INTO Folders (name, parent_id, color) VALUES (?, ?, ?);',
    [name, parentId, color]
  );
  return result.lastInsertRowId;
}

export function deleteFolder(id: number): void {
  db.runSync('DELETE FROM Folders WHERE id = ?;', [id]);
}

export function getTasks(folderId: number): Task[] {
  return db.getAllSync<Task>(
    'SELECT * FROM Tasks WHERE folder_id = ? ORDER BY id DESC;',
    [folderId]
  );
}

export function createTask(
  folderId: number,
  title: string,
  description = '',
  status: TaskStatus = 'TODO',
  priority: TaskPriority = 'MEDIUM'
): number {
  const result = db.runSync(
    'INSERT INTO Tasks (folder_id, title, description, status, priority) VALUES (?, ?, ?, ?, ?);',
    [folderId, title, description, status, priority]
  );
  return result.lastInsertRowId;
}

export function updateTaskStatus(id: number, status: TaskStatus): void {
  db.runSync(
    'UPDATE Tasks SET status = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?;',
    [status, id]
  );
}

export function deleteTask(id: number): void {
  db.runSync('DELETE FROM Tasks WHERE id = ?;', [id]);
}

export function getAuditLogs(limit = 50): AuditLog[] {
  return db.getAllSync<AuditLog>(
    'SELECT * FROM Audit_Logs ORDER BY id DESC LIMIT ?;',
    [limit]
  );
}

// -----------------------------------------------------------------------------
// Operaciones del Módulo de Notas (Note_Categories & Notes)
// -----------------------------------------------------------------------------

/**
 * Retorna las categorías principales (donde parent_id IS NULL)
 */
export function getMainNoteCategories(): NoteCategory[] {
  return db.getAllSync<NoteCategory>(`
    SELECT 
      c.*,
      (SELECT COUNT(*) FROM Note_Categories sub WHERE sub.parent_id = c.id) AS subcategories_count,
      (SELECT COUNT(*) FROM Notes n WHERE n.category_id = c.id OR n.category_id IN (SELECT id FROM Note_Categories sub WHERE sub.parent_id = c.id)) AS notes_count
    FROM Note_Categories c
    WHERE c.parent_id IS NULL
    ORDER BY c.created_at ASC;
  `);
}

/**
 * Retorna las subcategorías (Nivel 2) dependientes de una categoría principal
 */
export function getSubcategories(parentId: string): NoteCategory[] {
  return db.getAllSync<NoteCategory>(`
    SELECT 
      c.*,
      0 AS subcategories_count,
      (SELECT COUNT(*) FROM Notes n WHERE n.category_id = c.id) AS notes_count
    FROM Note_Categories c
    WHERE c.parent_id = ?
    ORDER BY c.created_at ASC;
  `, [parentId]);
}

/**
 * Obtener todas las categorías para listados planos (ej: selectores)
 */
export function getAllNoteCategories(): NoteCategory[] {
  return db.getAllSync<NoteCategory>(`
    SELECT 
      c.*,
      (SELECT COUNT(*) FROM Note_Categories sub WHERE sub.parent_id = c.id) AS subcategories_count,
      (SELECT COUNT(*) FROM Notes n WHERE n.category_id = c.id) AS notes_count
    FROM Note_Categories c
    ORDER BY c.name ASC;
  `);
}

/**
 * Crear una nueva categoría o subcategoría con UUID único
 */
export function createNoteCategory(name: string, parentId: string | null = null): string {
  const id = generateUUID();
  db.runSync(
    'INSERT INTO Note_Categories (id, parent_id, name) VALUES (?, ?, ?);',
    [id, parentId, name]
  );
  return id;
}

/**
 * Eliminar una categoría y todas sus notas en cascada
 */
export function deleteNoteCategory(id: string): void {
  db.runSync('DELETE FROM Note_Categories WHERE id = ?;', [id]);
}

/**
 * Consultas de notas aplicando la lógica de ordenamiento priorizado:
 * ORDER BY is_pinned DESC, updated_at DESC
 */
export function getNotes(categoryId?: string | null, isMainCategoryWithSubs = false): Note[] {
  // Pestaña "Todo": Búsqueda global cruzada
  if (!categoryId || categoryId === 'ALL') {
    return db.getAllSync<Note>(`
      SELECT 
        n.*,
        c.name AS category_name
      FROM Notes n
      LEFT JOIN Note_Categories c ON n.category_id = c.id
      ORDER BY n.is_pinned DESC, n.updated_at DESC;
    `);
  }

  // Categoría principal con subcategorías incluidas
  if (isMainCategoryWithSubs) {
    return db.getAllSync<Note>(`
      SELECT 
        n.*,
        c.name AS category_name
      FROM Notes n
      LEFT JOIN Note_Categories c ON n.category_id = c.id
      WHERE n.category_id = ? OR n.category_id IN (SELECT id FROM Note_Categories WHERE parent_id = ?)
      ORDER BY n.is_pinned DESC, n.updated_at DESC;
    `, [categoryId, categoryId]);
  }

  // Consulta base para categoría o subcategoría específica
  return db.getAllSync<Note>(`
    SELECT 
      n.*,
      c.name AS category_name
    FROM Notes n
    LEFT JOIN Note_Categories c ON n.category_id = c.id
    WHERE n.category_id = ?
    ORDER BY n.is_pinned DESC, n.updated_at DESC;
  `, [categoryId]);
}

export function getNoteById(id: string): Note | null {
  return db.getFirstSync<Note>(`
    SELECT 
      n.*,
      c.name AS category_name
    FROM Notes n
    LEFT JOIN Note_Categories c ON n.category_id = c.id
    WHERE n.id = ?;
  `, [id]);
}

export function createNote(
  categoryId: string,
  title: string,
  content = '',
  isPinned = false
): string {
  const id = generateUUID();
  const pinnedVal = isPinned ? 1 : 0;
  db.runSync(
    `INSERT INTO Notes (id, category_id, title, content, is_pinned, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'));`,
    [id, categoryId, title, content, pinnedVal]
  );
  return id;
}

export function updateNote(
  id: string,
  title: string,
  content: string,
  categoryId?: string,
  isPinned?: boolean
): void {
  if (categoryId !== undefined && isPinned !== undefined) {
    const pinnedVal = isPinned ? 1 : 0;
    db.runSync(
      `UPDATE Notes 
       SET title = ?, content = ?, category_id = ?, is_pinned = ?, updated_at = datetime('now', 'localtime') 
       WHERE id = ?;`,
      [title, content, categoryId, pinnedVal, id]
    );
  } else if (categoryId !== undefined) {
    db.runSync(
      `UPDATE Notes 
       SET title = ?, content = ?, category_id = ?, updated_at = datetime('now', 'localtime') 
       WHERE id = ?;`,
      [title, content, categoryId, id]
    );
  } else {
    db.runSync(
      `UPDATE Notes 
       SET title = ?, content = ?, updated_at = datetime('now', 'localtime') 
       WHERE id = ?;`,
      [title, content, id]
    );
  }
}

/**
 * Alternar el estado de fijado (Pin / Unpin)
 */
export function toggleNotePinned(id: string): void {
  db.runSync(
    `UPDATE Notes 
     SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END,
         updated_at = datetime('now', 'localtime')
     WHERE id = ?;`,
    [id]
  );
}

export function deleteNote(id: string): void {
  db.runSync('DELETE FROM Notes WHERE id = ?;', [id]);
}
