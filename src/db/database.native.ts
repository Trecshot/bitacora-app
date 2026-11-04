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
  description?: string;
  parent_id: number | null;
  color?: string;
  icon?: string;
  created_at?: string;
  updated_at?: string;
  task_count?: number;
  subfolder_count?: number;
  depth?: number;
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
  folder_id?: number | null;
  task_id?: number | null;
  action: 'CREATE' | 'UPDATE' | 'STATUS_CHANGE' | 'PRIORITY_CHANGE' | 'STATUS_TRIGGER' | 'PRIORITY_TRIGGER' | 'DELETE';
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
 * Crea las tablas de Proyectos (Folders, Tasks, Audit_Logs) con sus triggers,
 * índices B-Tree de rendimiento y las tablas independientes de Notas.
 */
export function initDatabase(): void {
  // Activar claves foráneas y modo WAL (Write-Ahead Logging) para concurrencia y máxima velocidad
  db.execSync('PRAGMA foreign_keys = ON;');
  db.execSync('PRAGMA journal_mode = WAL;');

  // Migración de Tablas de Proyectos
  db.execSync(`
    CREATE TABLE IF NOT EXISTS Folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
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
      folder_id INTEGER DEFAULT NULL,
      task_id INTEGER DEFAULT NULL,
      action TEXT NOT NULL,
      old_value TEXT DEFAULT NULL,
      new_value TEXT DEFAULT NULL,
      timestamp TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Asegurar que las columnas task_id y folder_id existan en Audit_Logs
  const auditColumns = db.getAllSync<{ name: string }>('PRAGMA table_info(Audit_Logs);');
  const hasTaskIdColumn = auditColumns.some((col) => col.name === 'task_id');
  if (!hasTaskIdColumn) {
    db.execSync('ALTER TABLE Audit_Logs ADD COLUMN task_id INTEGER DEFAULT NULL;');
  }

  const hasFolderIdColumn = auditColumns.some((col) => col.name === 'folder_id');
  if (!hasFolderIdColumn) {
    db.execSync('ALTER TABLE Audit_Logs ADD COLUMN folder_id INTEGER DEFAULT NULL;');
    try {
      db.execSync(`
        UPDATE Audit_Logs 
        SET folder_id = (SELECT folder_id FROM Tasks WHERE Tasks.id = Audit_Logs.entity_id)
        WHERE entity_type = 'TASK' AND folder_id IS NULL;

        UPDATE Audit_Logs 
        SET folder_id = entity_id
        WHERE entity_type = 'FOLDER' AND folder_id IS NULL;
      `);
    } catch (e) {
      // Ignorar si aún no hay tablas de datos
    }
  }

  // Asegurar que la columna description exista en Folders para almacenar contexto Markdown
  const folderColumns = db.getAllSync<{ name: string }>('PRAGMA table_info(Folders);');
  const hasDescriptionColumn = folderColumns.some((col) => col.name === 'description');
  if (!hasDescriptionColumn) {
    db.execSync("ALTER TABLE Folders ADD COLUMN description TEXT DEFAULT '';");
  }

  // Índices B-Tree para búsquedas eficientes por proyecto, fecha y jerarquías
  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_audit_folder_timestamp ON Audit_Logs (folder_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_task_id ON Audit_Logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON Audit_Logs(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON Audit_Logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_folder_id ON Tasks(folder_id);
    CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON Folders(parent_id);
  `);

  // Triggers de Auditoría para Tasks (con soporte de folder_id y task_id indexados)
  db.execSync(`
    DROP TRIGGER IF EXISTS trg_tasks_insert;
    CREATE TRIGGER trg_tasks_insert
    AFTER INSERT ON Tasks
    BEGIN
      INSERT INTO Audit_Logs (entity_type, entity_id, folder_id, task_id, action, old_value, new_value, timestamp)
      VALUES (
        'TASK',
        NEW.id,
        NEW.folder_id,
        NEW.id,
        'CREATE',
        NULL,
        json_object('title', NEW.title, 'status', NEW.status, 'priority', NEW.priority, 'folder_id', NEW.folder_id),
        datetime('now', 'localtime')
      );
    END;

    DROP TRIGGER IF EXISTS trg_tasks_update;
    CREATE TRIGGER trg_tasks_update
    AFTER UPDATE ON Tasks
    BEGIN
      INSERT INTO Audit_Logs (entity_type, entity_id, folder_id, task_id, action, old_value, new_value, timestamp)
      VALUES (
        'TASK',
        NEW.id,
        NEW.folder_id,
        NEW.id,
        CASE 
          WHEN OLD.status <> NEW.status THEN 'STATUS_CHANGE'
          WHEN OLD.priority <> NEW.priority THEN 'PRIORITY_CHANGE'
          ELSE 'UPDATE'
        END,
        json_object('title', OLD.title, 'status', OLD.status, 'priority', OLD.priority),
        json_object('title', NEW.title, 'status', NEW.status, 'priority', NEW.priority),
        datetime('now', 'localtime')
      );
    END;

    DROP TRIGGER IF EXISTS trg_tasks_delete;
    CREATE TRIGGER trg_tasks_delete
    AFTER DELETE ON Tasks
    BEGIN
      INSERT INTO Audit_Logs (entity_type, entity_id, folder_id, task_id, action, old_value, new_value, timestamp)
      VALUES (
        'TASK',
        OLD.id,
        OLD.folder_id,
        OLD.id,
        'DELETE',
        json_object('title', OLD.title, 'status', OLD.status, 'priority', OLD.priority, 'folder_id', OLD.folder_id),
        NULL,
        datetime('now', 'localtime')
      );
    END;
  `);

  // Triggers de Auditoría para Folders
  db.execSync(`
    DROP TRIGGER IF EXISTS trg_folders_insert;
    CREATE TRIGGER trg_folders_insert
    AFTER INSERT ON Folders
    BEGIN
      INSERT INTO Audit_Logs (entity_type, entity_id, folder_id, task_id, action, old_value, new_value, timestamp)
      VALUES (
        'FOLDER',
        NEW.id,
        NEW.id,
        NULL,
        'CREATE',
        NULL,
        json_object('name', NEW.name, 'parent_id', NEW.parent_id),
        datetime('now', 'localtime')
      );
    END;

    DROP TRIGGER IF EXISTS trg_folders_update;
    CREATE TRIGGER trg_folders_update
    AFTER UPDATE ON Folders
    BEGIN
      INSERT INTO Audit_Logs (entity_type, entity_id, folder_id, task_id, action, old_value, new_value, timestamp)
      VALUES (
        'FOLDER',
        NEW.id,
        NEW.id,
        NULL,
        'UPDATE',
        json_object('name', OLD.name, 'description', OLD.description),
        json_object('name', NEW.name, 'description', NEW.description),
        datetime('now', 'localtime')
      );
    END;

    DROP TRIGGER IF EXISTS trg_folders_delete;
    CREATE TRIGGER trg_folders_delete
    AFTER DELETE ON Folders
    BEGIN
      INSERT INTO Audit_Logs (entity_type, entity_id, folder_id, task_id, action, old_value, new_value, timestamp)
      VALUES (
        'FOLDER',
        OLD.id,
        OLD.id,
        NULL,
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
      `INSERT INTO Folders (name, color, icon, description) VALUES (?, ?, ?, ?);`,
      [
        'Proyecto Principal',
        '#3B82F6',
        'folder-kanban',
        '# Visión del Proyecto\nEste espacio centraliza las tareas, hitos y notas clave de la bitácora.\n\n- **Objetivo**: Optimizar la productividad y organización.\n- **Metodología**: Tablero Kanban interactivo con persistencia local SQLite.',
      ]
    );
    db.runSync(
      `INSERT INTO Folders (name, color, icon, description) VALUES (?, ?, ?, ?);`,
      ['Documentación & Notas', '#10B981', 'book-open', 'Documentación técnica del sistema, guías y especificaciones de arquitectura.']
    );
    db.runSync(
      `INSERT INTO Folders (name, color, icon, description) VALUES (?, ?, ?, ?);`,
      ['Diseño UI/UX', '#8B5CF6', 'palette', 'Bocetos, patrones de componentes y guías de estilos para la aplicación.']
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
  } else {
    // Si la carpeta 1 ya existía sin descripción previa a la migración
    try {
      const rootFolder = db.getFirstSync<{ description: string | null }>('SELECT description FROM Folders WHERE id = 1;');
      if (rootFolder && (!rootFolder.description || rootFolder.description.trim() === '')) {
        db.runSync(
          "UPDATE Folders SET description = ? WHERE id = 1;",
          [
            '# Visión del Proyecto\nEste espacio centraliza las tareas, hitos y notas clave de la bitácora.\n\n- **Objetivo**: Optimizar la productividad y organización.\n- **Metodología**: Tablero Kanban interactivo con persistencia local SQLite.',
          ]
        );
      }
    } catch (e) {
      // Ignorar si aún no existe
    }
  }
}

function seedNoteDataIfEmpty(): void {
  const countRow = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Note_Categories;');
  if (!countRow || countRow.count === 0) {
    const seriesId = generateUUID();
    const personalId = generateUUID();
    const ideasId = generateUUID();

    db.runSync(`INSERT INTO Note_Categories (id, parent_id, name) VALUES (?, NULL, ?);`, [seriesId, 'Series']);
    db.runSync(`INSERT INTO Note_Categories (id, parent_id, name) VALUES (?, NULL, ?);`, [personalId, 'Personal']);
    db.runSync(`INSERT INTO Note_Categories (id, parent_id, name) VALUES (?, NULL, ?);`, [ideasId, 'Ideas']);

    const seriesAnimadasId = generateUUID();
    const seriesNormalesId = generateUUID();

    db.runSync(`INSERT INTO Note_Categories (id, parent_id, name) VALUES (?, ?, ?);`, [seriesAnimadasId, seriesId, 'Series Animadas']);
    db.runSync(`INSERT INTO Note_Categories (id, parent_id, name) VALUES (?, ?, ?);`, [seriesNormalesId, seriesId, 'Series Normales']);

    db.runSync(
      `INSERT INTO Notes (id, category_id, title, content, is_pinned) VALUES (?, ?, ?, ?, ?);`,
      [
        generateUUID(),
        seriesAnimadasId,
        '⭐ Series Animadas Pendientes',
        '• Arcane: Temporada 2\n• Invincible\n• Cyberpunk: Edgerunners\n• Castlevania: Nocturne',
        1,
      ]
    );

    db.runSync(
      `INSERT INTO Notes (id, category_id, title, content, is_pinned) VALUES (?, ?, ?, ?, ?);`,
      [
        generateUUID(),
        seriesNormalesId,
        'Series Live Action Recomendadas',
        '• Severance (Temporada 2)\n• Shōgun\n• The Bear',
        0,
      ]
    );

    db.runSync(
      `INSERT INTO Notes (id, category_id, title, content, is_pinned) VALUES (?, ?, ?, ?, ?);`,
      [
        generateUUID(),
        personalId,
        '⭐ Recordatorios Personales',
        '• Revisar entrega de proyecto de Bitácora\n• Comprar insumos de trabajo\n• Programar copia de seguridad',
        1,
      ]
    );

    db.runSync(
      `INSERT INTO Notes (id, category_id, title, content, is_pinned) VALUES (?, ?, ?, ?, ?);`,
      [
        generateUUID(),
        ideasId,
        'Ideas de Diseño UI',
        'Cuadrícula asimétrica Masonry para notas, pestañas tipo píldora horizontales y selector de subcategorías dinámico.',
        0,
      ]
    );
  }
}

// -----------------------------------------------------------------------------
// Operaciones de Proyectos / Folders & Tasks con CTEs Recursivas
// -----------------------------------------------------------------------------

const RECURSIVE_FOLDER_CTE = `
  WITH RECURSIVE
  FolderDepth AS (
    SELECT id, parent_id, 0 AS depth
    FROM Folders
    WHERE parent_id IS NULL
    UNION ALL
    SELECT f.id, f.parent_id, fd.depth + 1
    FROM Folders f
    INNER JOIN FolderDepth fd ON f.parent_id = fd.id
  ),
  FolderHierarchy AS (
    SELECT id AS root_id, id AS descendant_id, 0 AS rel_depth
    FROM Folders
    UNION ALL
    SELECT fh.root_id, f.id AS descendant_id, fh.rel_depth + 1
    FROM Folders f
    INNER JOIN FolderHierarchy fh ON f.parent_id = fh.descendant_id
  )
`;

/**
 * Obtiene carpetas utilizando Common Table Expressions (CTEs) recursivas
 * para calcular en una sola transacción SQLite la profundidad (depth),
 * el conteo total de tareas anidadas y el total de subcarpetas descendientes.
 */
export function getFolders(parentId: number | null = null): Folder[] {
  const whereClause = parentId === null ? 'WHERE f.parent_id IS NULL' : 'WHERE f.parent_id = ?';
  const query = `
    ${RECURSIVE_FOLDER_CTE}
    SELECT 
      f.*,
      COALESCE(fd.depth, 0) AS depth,
      (
        SELECT COUNT(*)
        FROM Tasks t
        INNER JOIN FolderHierarchy fh ON t.folder_id = fh.descendant_id
        WHERE fh.root_id = f.id
      ) AS task_count,
      (
        SELECT COUNT(*)
        FROM FolderHierarchy fh
        WHERE fh.root_id = f.id AND fh.rel_depth > 0
      ) AS subfolder_count
    FROM Folders f
    LEFT JOIN FolderDepth fd ON fd.id = f.id
    ${whereClause}
    ORDER BY f.id DESC;
  `;

  return parentId === null
    ? db.getAllSync<Folder>(query)
    : db.getAllSync<Folder>(query, [parentId]);
}

export function getFolderById(id: number): Folder | null {
  const query = `
    ${RECURSIVE_FOLDER_CTE}
    SELECT 
      f.*,
      COALESCE(fd.depth, 0) AS depth,
      (
        SELECT COUNT(*)
        FROM Tasks t
        INNER JOIN FolderHierarchy fh ON t.folder_id = fh.descendant_id
        WHERE fh.root_id = f.id
      ) AS task_count,
      (
        SELECT COUNT(*)
        FROM FolderHierarchy fh
        WHERE fh.root_id = f.id AND fh.rel_depth > 0
      ) AS subfolder_count
    FROM Folders f
    LEFT JOIN FolderDepth fd ON fd.id = f.id
    WHERE f.id = ?;
  `;
  return db.getFirstSync<Folder>(query, [id]);
}

export function createFolder(
  name: string,
  parentId: number | null = null,
  color = '#3B82F6',
  description = ''
): number {
  const result = db.runSync(
    'INSERT INTO Folders (name, parent_id, color, description) VALUES (?, ?, ?, ?);',
    [name, parentId, color, description]
  );
  return result.lastInsertRowId;
}

export function updateFolderDescription(id: number, description: string): void {
  db.runSync(
    "UPDATE Folders SET description = ?, updated_at = datetime('now', 'localtime') WHERE id = ?;",
    [description, id]
  );
}

export async function updateFolderDescriptionAsync(id: number, description: string): Promise<void> {
  await db.runAsync(
    "UPDATE Folders SET description = ?, updated_at = datetime('now', 'localtime') WHERE id = ?;",
    [description, id]
  );
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

// Ejecución de transacciones SQL en segundo plano con resolución de promesas (Modo WAL)
export async function updateTaskStatusAsync(id: number, status: TaskStatus): Promise<void> {
  await db.runAsync(
    'UPDATE Tasks SET status = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?;',
    [status, id]
  );
}

export async function createTaskAsync(
  folderId: number,
  title: string,
  description = '',
  status: TaskStatus = 'TODO',
  priority: TaskPriority = 'MEDIUM'
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO Tasks (folder_id, title, description, status, priority) VALUES (?, ?, ?, ?, ?);',
    [folderId, title, description, status, priority]
  );
  return result.lastInsertRowId;
}

export async function deleteTaskAsync(id: number): Promise<void> {
  await db.runAsync('DELETE FROM Tasks WHERE id = ?;', [id]);
}

export function deleteTask(id: number): void {
  db.runSync('DELETE FROM Tasks WHERE id = ?;', [id]);
}

export function getAuditLogs(limit = 50, taskId?: number): AuditLog[] {
  if (taskId !== undefined) {
    return db.getAllSync<AuditLog>(
      'SELECT * FROM Audit_Logs WHERE task_id = ? ORDER BY timestamp DESC, id DESC LIMIT ?;',
      [taskId, limit]
    );
  }
  return db.getAllSync<AuditLog>(
    'SELECT * FROM Audit_Logs ORDER BY timestamp DESC, id DESC LIMIT ?;',
    [limit]
  );
}

/**
 * Consulta de extracción con paginación (LIMIT/OFFSET) utilizando
 * el índice compuesto idx_audit_folder_timestamp para optimizar la velocidad de lectura.
 */
export function getProjectAuditLogs(folderId: number, limit = 20, offset = 0): AuditLog[] {
  return db.getAllSync<AuditLog>(
    `SELECT * FROM Audit_Logs 
     WHERE folder_id = ? 
     ORDER BY timestamp DESC, id DESC 
     LIMIT ? OFFSET ?;`,
    [folderId, limit, offset]
  );
}

export async function getProjectAuditLogsAsync(folderId: number, limit = 20, offset = 0): Promise<AuditLog[]> {
  return await db.getAllAsync<AuditLog>(
    `SELECT * FROM Audit_Logs 
     WHERE folder_id = ? 
     ORDER BY timestamp DESC, id DESC 
     LIMIT ? OFFSET ?;`,
    [folderId, limit, offset]
  );
}

// -----------------------------------------------------------------------------
// Operaciones del Módulo de Notas (Note_Categories & Notes)
// -----------------------------------------------------------------------------

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

export function createNoteCategory(name: string, parentId: string | null = null): string {
  const id = generateUUID();
  db.runSync(
    'INSERT INTO Note_Categories (id, parent_id, name) VALUES (?, ?, ?);',
    [id, parentId, name]
  );
  return id;
}

export function deleteNoteCategory(id: string): void {
  db.runSync('DELETE FROM Note_Categories WHERE id = ?;', [id]);
}

export function getNotes(categoryId?: string | null, isMainCategoryWithSubs = false): Note[] {
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
