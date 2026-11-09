import * as SQLite from 'expo-sqlite';
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
  INITIAL_PROJECT_VISION_MARKDOWN,
  SEED_FOLDERS_DATA,
  SEED_TAGS_DATA,
} from './seedData';
import { DEFAULT_FOLDER_COLOR } from '../utils/dateAndTaskUtils';

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

// Instanciar la conexión sincrónica según la arquitectura requerida
export const db = SQLite.openDatabaseSync('bitacora.db');

/**
 * Función de migración inicial:
 * Crea las tablas de Proyectos (Folders, Tasks con Soft Delete, Audit_Logs) con sus triggers,
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
      is_deleted BOOLEAN DEFAULT 0,
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

  // Asegurar que la columna is_deleted exista en Tasks (Migración Soft Delete)
  const taskColumns = db.getAllSync<{ name: string }>('PRAGMA table_info(Tasks);');
  if (!taskColumns.some((col) => col.name === 'is_deleted')) {
    db.execSync('ALTER TABLE Tasks ADD COLUMN is_deleted BOOLEAN DEFAULT 0;');
  }

  // Asegurar que las columnas task_id y folder_id existan en Audit_Logs
  const auditColumns = db.getAllSync<{ name: string }>('PRAGMA table_info(Audit_Logs);');
  if (!auditColumns.some((col) => col.name === 'task_id')) {
    db.execSync('ALTER TABLE Audit_Logs ADD COLUMN task_id INTEGER DEFAULT NULL;');
  }

  if (!auditColumns.some((col) => col.name === 'folder_id')) {
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
    } catch {
      // Ignorar si aún no hay tablas de datos
    }
  }

  // Asegurar que la columna description exista en Folders para almacenar contexto Markdown
  const folderColumns = db.getAllSync<{ name: string }>('PRAGMA table_info(Folders);');
  if (!folderColumns.some((col) => col.name === 'description')) {
    db.execSync("ALTER TABLE Folders ADD COLUMN description TEXT DEFAULT '';");
  }

  // Índices B-Tree para búsquedas eficientes por proyecto, fecha, borrado lógico y jerarquías
  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_audit_folder_timestamp ON Audit_Logs (folder_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_task_id ON Audit_Logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON Audit_Logs(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON Audit_Logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_folder_id ON Tasks(folder_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_soft_delete_stale ON Tasks(is_deleted, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON Folders(parent_id);
  `);

  // Triggers de Auditoría para Tasks (con trazabilidad de Soft Delete y Restauración)
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
        json_object(
          'title', NEW.title,
          'status', NEW.status,
          'priority', NEW.priority,
          'folder_id', NEW.folder_id,
          'due_date', NEW.due_date,
          'is_deleted', COALESCE(NEW.is_deleted, 0)
        ),
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
          WHEN COALESCE(OLD.is_deleted, 0) = 0 AND COALESCE(NEW.is_deleted, 0) = 1 THEN 'SOFT_DELETE'
          WHEN COALESCE(OLD.is_deleted, 0) = 1 AND COALESCE(NEW.is_deleted, 0) = 0 THEN 'RESTORE'
          WHEN OLD.status <> NEW.status THEN 'STATUS_CHANGE'
          WHEN OLD.priority <> NEW.priority THEN 'PRIORITY_CHANGE'
          ELSE 'UPDATE'
        END,
        json_object(
          'title', OLD.title,
          'status', OLD.status,
          'priority', OLD.priority,
          'due_date', OLD.due_date,
          'is_deleted', COALESCE(OLD.is_deleted, 0)
        ),
        json_object(
          'title', NEW.title,
          'status', NEW.status,
          'priority', NEW.priority,
          'due_date', NEW.due_date,
          'is_deleted', COALESCE(NEW.is_deleted, 0)
        ),
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
        json_object('name', NEW.name, 'parent_id', NEW.parent_id, 'color', NEW.color, 'description', NEW.description),
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

  // Migración del Esquema Independiente para Notas (Note_Categories, Notes, Tags, Note_Tags & FTS5)
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

    -- Tablas para Taxonomía Transversal (Relación Muchos a Muchos: Tags & Note_Tags)
    CREATE TABLE IF NOT EXISTS Tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#3B82F6',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS Note_Tags (
      note_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES Notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES Tags(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON Note_Tags(note_id);
    CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON Note_Tags(tag_id);

    -- Tabla Virtual de Búsqueda de Texto Completo FTS5 para Notas
    CREATE VIRTUAL TABLE IF NOT EXISTS Notes_FTS USING fts5(
      id UNINDEXED,
      title,
      content,
      tokenize = 'unicode61'
    );

    -- Triggers para sincronización automática de FTS5
    DROP TRIGGER IF EXISTS trg_notes_fts_insert;
    CREATE TRIGGER trg_notes_fts_insert AFTER INSERT ON Notes
    BEGIN
      INSERT INTO Notes_FTS(id, title, content) VALUES (NEW.id, NEW.title, NEW.content);
    END;

    DROP TRIGGER IF EXISTS trg_notes_fts_update;
    CREATE TRIGGER trg_notes_fts_update AFTER UPDATE ON Notes
    BEGIN
      DELETE FROM Notes_FTS WHERE id = OLD.id;
      INSERT INTO Notes_FTS(id, title, content) VALUES (NEW.id, NEW.title, NEW.content);
    END;

    DROP TRIGGER IF EXISTS trg_notes_fts_delete;
    CREATE TRIGGER trg_notes_fts_delete AFTER DELETE ON Notes
    BEGIN
      DELETE FROM Notes_FTS WHERE id = OLD.id;
    END;
  `);

  // Sincronizar notas existentes en la tabla virtual FTS5 si aún no están indexadas
  try {
    db.execSync(`
      INSERT INTO Notes_FTS(id, title, content)
      SELECT id, title, content FROM Notes
      WHERE id NOT IN (SELECT id FROM Notes_FTS);
    `);
  } catch (e) {
    console.warn('Advertencia al indexar FTS5:', e);
  }

  // Datos de muestra iniciales
  seedProjectDataIfEmpty();
  seedNoteDataIfEmpty();
  seedTagDataIfEmpty();
}

function seedProjectDataIfEmpty(): void {
  const countRow = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Folders;');
  if (!countRow || countRow.count === 0) {
    for (const folder of SEED_FOLDERS_DATA) {
      db.runSync(
        `INSERT INTO Folders (name, color, icon, description) VALUES (?, ?, ?, ?);`,
        [folder.name, folder.color, folder.icon, folder.description]
      );
    }

    // Tareas iniciales para la carpeta 1 (incluyendo una tarea estancada > 7 días y fechas límite)
    db.runSync(
      `INSERT INTO Tasks (folder_id, title, description, status, priority, due_date, is_deleted)
       VALUES (?, ?, ?, ?, ?, date('now', 'localtime'), 0);`,
      [1, 'Configurar arquitectura SQLite y Triggers', 'Persistencia local con Expo SQLite y Soft Deletes', 'DONE', 'HIGH']
    );
    db.runSync(
      `INSERT INTO Tasks (folder_id, title, description, status, priority, due_date, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, date('now', '-2 days', 'localtime'), 0, datetime('now', '-10 days'), datetime('now', '-9 days'));`,
      [1, 'Implementar vista de Kanban interactiva', 'Arrastre y Edge Scrolling con react-native-reanimated', 'IN_PROGRESS', 'HIGH']
    );
    db.runSync(
      `INSERT INTO Tasks (folder_id, title, description, status, priority, due_date, is_deleted)
       VALUES (?, ?, ?, ?, ?, date('now', '+3 days', 'localtime'), 0);`,
      [1, 'Pruebas de navegación con Expo Router', 'Validar rutas dinámicas y Breadcrumbs en app/folder/[id]', 'TODO', 'MEDIUM']
    );
  } else {
    try {
      const rootFolder = db.getFirstSync<{ description: string | null }>(
        'SELECT description FROM Folders WHERE id = 1;'
      );
      if (rootFolder && (!rootFolder.description || rootFolder.description.trim() === '')) {
        db.runSync('UPDATE Folders SET description = ? WHERE id = 1;', [
          INITIAL_PROJECT_VISION_MARKDOWN,
        ]);
      }
    } catch {
      // Ignorar si aún no existe
    }
  }
}

function seedNoteDataIfEmpty(): void {
  const countRow = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM Note_Categories;'
  );
  if (!countRow || countRow.count === 0) {
    const seriesId = generateUUID();
    const personalId = generateUUID();
    const ideasId = generateUUID();

    db.runSync(`INSERT INTO Note_Categories (id, parent_id, name) VALUES (?, NULL, ?);`, [
      seriesId,
      'Series',
    ]);
    db.runSync(`INSERT INTO Note_Categories (id, parent_id, name) VALUES (?, NULL, ?);`, [
      personalId,
      'Personal',
    ]);
    db.runSync(`INSERT INTO Note_Categories (id, parent_id, name) VALUES (?, NULL, ?);`, [
      ideasId,
      'Ideas',
    ]);

    const seriesAnimadasId = generateUUID();
    const seriesNormalesId = generateUUID();

    db.runSync(`INSERT INTO Note_Categories (id, parent_id, name) VALUES (?, ?, ?);`, [
      seriesAnimadasId,
      seriesId,
      'Series Animadas',
    ]);
    db.runSync(`INSERT INTO Note_Categories (id, parent_id, name) VALUES (?, ?, ?);`, [
      seriesNormalesId,
      seriesId,
      'Series Normales',
    ]);

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

function seedTagDataIfEmpty(): void {
  const countRow = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Tags;');
  if (!countRow || countRow.count === 0) {
    const defaultTags = SEED_TAGS_DATA.map((t) => ({
      id: generateUUID(),
      name: t.name,
      color: t.color,
    }));

    for (const tag of defaultTags) {
      db.runSync('INSERT INTO Tags (id, name, color) VALUES (?, ?, ?);', [
        tag.id,
        tag.name,
        tag.color,
      ]);
    }

    // Asociar etiquetas iniciales para demostrar taxonomía transversal inmediata
    const existingNotes = db.getAllSync<{ id: string }>(
      'SELECT id FROM Notes ORDER BY created_at ASC LIMIT 4;'
    );
    if (existingNotes.length >= 2 && defaultTags.length >= 4) {
      try {
        db.runSync('INSERT OR IGNORE INTO Note_Tags (note_id, tag_id) VALUES (?, ?);', [
          existingNotes[0].id,
          defaultTags[2].id, // Ideas
        ]);
        db.runSync('INSERT OR IGNORE INTO Note_Tags (note_id, tag_id) VALUES (?, ?);', [
          existingNotes[0].id,
          defaultTags[4].id, // Personal
        ]);
        db.runSync('INSERT OR IGNORE INTO Note_Tags (note_id, tag_id) VALUES (?, ?);', [
          existingNotes[1].id,
          defaultTags[1].id, // Trabajo
        ]);
        if (existingNotes.length >= 3) {
          db.runSync('INSERT OR IGNORE INTO Note_Tags (note_id, tag_id) VALUES (?, ?);', [
            existingNotes[2].id,
            defaultTags[0].id, // Urgente
          ]);
          db.runSync('INSERT OR IGNORE INTO Note_Tags (note_id, tag_id) VALUES (?, ?);', [
            existingNotes[2].id,
            defaultTags[4].id, // Personal
          ]);
        }
      } catch (err) {
        console.warn('Error al vincular tags iniciales:', err);
      }
    }
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

const FOLDER_SELECT_WITH_METRICS_SQL = `
  SELECT 
    f.*,
    COALESCE(fd.depth, 0) AS depth,
    (
      SELECT COUNT(*)
      FROM Tasks t
      INNER JOIN FolderHierarchy fh ON t.folder_id = fh.descendant_id
      WHERE fh.root_id = f.id
        AND COALESCE(t.is_deleted, 0) = 0
    ) AS task_count,
    (
      SELECT COUNT(*)
      FROM Tasks t
      INNER JOIN FolderHierarchy fh ON t.folder_id = fh.descendant_id
      WHERE fh.root_id = f.id
        AND COALESCE(t.is_deleted, 0) = 0
        AND t.status = 'IN_PROGRESS'
        AND datetime(t.updated_at) < datetime('now', '-7 days')
    ) AS stale_task_count,
    (
      SELECT COUNT(*)
      FROM FolderHierarchy fh
      WHERE fh.root_id = f.id AND fh.rel_depth > 0
    ) AS subfolder_count
  FROM Folders f
  LEFT JOIN FolderDepth fd ON fd.id = f.id
`;

/**
 * Obtiene carpetas utilizando Common Table Expressions (CTEs) recursivas
 * para calcular en una sola consulta la profundidad (depth), el conteo de tareas
 * activas (is_deleted = 0), el total de subcarpetas y las tareas estancadas (> 7 días en IN_PROGRESS).
 */
export function getFolders(parentId: number | null = null): Folder[] {
  const whereClause = parentId === null ? 'WHERE f.parent_id IS NULL' : 'WHERE f.parent_id = ?';
  const query = `
    ${RECURSIVE_FOLDER_CTE}
    ${FOLDER_SELECT_WITH_METRICS_SQL}
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
    ${FOLDER_SELECT_WITH_METRICS_SQL}
    WHERE f.id = ?;
  `;
  return db.getFirstSync<Folder>(query, [id]);
}

/**
 * Obtiene la ruta absoluta ascendente (Breadcrumbs) desde la carpeta raíz hasta la carpeta actual.
 */
export function getFolderBreadcrumbs(folderId: number): Folder[] {
  const query = `
    WITH RECURSIVE BreadcrumbPath AS (
      SELECT f.*, 0 AS step
      FROM Folders f
      WHERE f.id = ?
      UNION ALL
      SELECT parent.*, bp.step + 1
      FROM Folders parent
      INNER JOIN BreadcrumbPath bp ON parent.id = bp.parent_id
    )
    SELECT id, name, description, parent_id, color, icon, created_at, updated_at
    FROM BreadcrumbPath
    ORDER BY step DESC;
  `;
  return db.getAllSync<Folder>(query, [folderId]);
}

/**
 * Calcula el total global de tareas estancadas (Stale Tasks):
 * SELECT COUNT(*) FROM Tasks WHERE status = 'IN_PROGRESS' AND updated_at < datetime('now', '-7 days')
 */
export function getGlobalStaleTasksCount(): number {
  const row = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) AS count
     FROM Tasks
     WHERE COALESCE(is_deleted, 0) = 0
       AND status = 'IN_PROGRESS'
       AND datetime(updated_at) < datetime('now', '-7 days');`
  );
  return row?.count ?? 0;
}

/**
 * Creación atómica de carpeta encapsulada en BEGIN TRANSACTION y COMMIT.
 * Si es una subcarpeta y no se especifica un color explícito, hereda automáticamente
 * el color hexadecimal de su nodo padre (default_color).
 */
export function createFolder(
  name: string,
  parentId: number | null = null,
  color?: string,
  description = ''
): number {
  db.execSync('BEGIN TRANSACTION;');
  try {
    let resolvedColor = color;
    if (!resolvedColor && parentId !== null) {
      const parentRow = db.getFirstSync<{ color: string | null }>(
        'SELECT color FROM Folders WHERE id = ?;',
        [parentId]
      );
      resolvedColor = parentRow?.color || DEFAULT_FOLDER_COLOR;
    }
    const finalColor = resolvedColor || DEFAULT_FOLDER_COLOR;

    const result = db.runSync(
      'INSERT INTO Folders (name, parent_id, color, description) VALUES (?, ?, ?, ?);',
      [name, parentId, finalColor, description]
    );

    db.execSync('COMMIT;');
    return result.lastInsertRowId;
  } catch (error) {
    try {
      db.execSync('ROLLBACK;');
    } catch {
      // Ignorar si la transacción ya fue cerrada
    }
    throw error;
  }
}

export function updateFolderDescription(id: number, description: string): void {
  db.runSync(
    "UPDATE Folders SET description = ?, updated_at = datetime('now', 'localtime') WHERE id = ?;",
    [description, id]
  );
}

export async function updateFolderDescriptionAsync(
  id: number,
  description: string
): Promise<void> {
  await db.runAsync(
    "UPDATE Folders SET description = ?, updated_at = datetime('now', 'localtime') WHERE id = ?;",
    [description, id]
  );
}

export function deleteFolder(id: number): void {
  db.runSync('DELETE FROM Folders WHERE id = ?;', [id]);
}

/**
 * Obtiene únicamente las tareas activas (Borrado Lógico: is_deleted = 0)
 */
export function getTasks(folderId: number): Task[] {
  return db.getAllSync<Task>(
    'SELECT * FROM Tasks WHERE folder_id = ? AND COALESCE(is_deleted, 0) = 0 ORDER BY id DESC;',
    [folderId]
  );
}

/**
 * Obtiene las tareas en la Papelera de Reciclaje (is_deleted = 1)
 */
export function getDeletedTasks(folderId?: number): Task[] {
  if (folderId !== undefined) {
    return db.getAllSync<Task>(
      'SELECT * FROM Tasks WHERE folder_id = ? AND COALESCE(is_deleted, 0) = 1 ORDER BY updated_at DESC, id DESC;',
      [folderId]
    );
  }
  return db.getAllSync<Task>(
    'SELECT * FROM Tasks WHERE COALESCE(is_deleted, 0) = 1 ORDER BY updated_at DESC, id DESC;'
  );
}

export function createTask(
  folderId: number,
  title: string,
  description = '',
  status: TaskStatus = 'TODO',
  priority: TaskPriority = 'MEDIUM',
  dueDate: string | null = null
): number {
  const result = db.runSync(
    'INSERT INTO Tasks (folder_id, title, description, status, priority, due_date, is_deleted) VALUES (?, ?, ?, ?, ?, ?, 0);',
    [folderId, title, description, status, priority, dueDate]
  );
  return result.lastInsertRowId;
}

export function updateTaskStatus(id: number, status: TaskStatus): void {
  db.runSync(
    "UPDATE Tasks SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?;",
    [status, id]
  );
}

// Ejecución de transacciones SQL en segundo plano con resolución de promesas (Modo WAL)
export async function updateTaskStatusAsync(id: number, status: TaskStatus): Promise<void> {
  await db.runAsync(
    "UPDATE Tasks SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?;",
    [status, id]
  );
}

export async function createTaskAsync(
  folderId: number,
  title: string,
  description = '',
  status: TaskStatus = 'TODO',
  priority: TaskPriority = 'MEDIUM',
  dueDate: string | null = null
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO Tasks (folder_id, title, description, status, priority, due_date, is_deleted) VALUES (?, ?, ?, ?, ?, ?, 0);',
    [folderId, title, description, status, priority, dueDate]
  );
  return result.lastInsertRowId;
}

/**
 * Borrado Lógico (Soft Delete): marca is_deleted = 1 preservando la trazabilidad en Audit_Logs
 */
export async function deleteTaskAsync(id: number): Promise<void> {
  await db.runAsync(
    "UPDATE Tasks SET is_deleted = 1, updated_at = datetime('now', 'localtime') WHERE id = ?;",
    [id]
  );
}

export function deleteTask(id: number): void {
  db.runSync(
    "UPDATE Tasks SET is_deleted = 1, updated_at = datetime('now', 'localtime') WHERE id = ?;",
    [id]
  );
}

/**
 * Restaura una tarea desde la Papelera de Reciclaje (is_deleted = 0)
 */
export function restoreTask(id: number): void {
  db.runSync(
    "UPDATE Tasks SET is_deleted = 0, updated_at = datetime('now', 'localtime') WHERE id = ?;",
    [id]
  );
}

export async function restoreTaskAsync(id: number): Promise<void> {
  await db.runAsync(
    "UPDATE Tasks SET is_deleted = 0, updated_at = datetime('now', 'localtime') WHERE id = ?;",
    [id]
  );
}

/**
 * Eliminación física definitiva desde la Papelera de Reciclaje
 */
export function hardDeleteTask(id: number): void {
  db.runSync('DELETE FROM Tasks WHERE id = ?;', [id]);
}

export async function hardDeleteTaskAsync(id: number): Promise<void> {
  await db.runAsync('DELETE FROM Tasks WHERE id = ?;', [id]);
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

const PROJECT_AUDIT_LOGS_SQL = `
  SELECT * FROM Audit_Logs 
  WHERE folder_id = ? 
  ORDER BY timestamp DESC, id DESC 
  LIMIT ? OFFSET ?;
`;

/**
 * Consulta de extracción con paginación (LIMIT/OFFSET) utilizando
 * el índice compuesto idx_audit_folder_timestamp para optimizar la velocidad de lectura.
 */
export function getProjectAuditLogs(folderId: number, limit = 20, offset = 0): AuditLog[] {
  return db.getAllSync<AuditLog>(PROJECT_AUDIT_LOGS_SQL, [folderId, limit, offset]);
}

export async function getProjectAuditLogsAsync(
  folderId: number,
  limit = 20,
  offset = 0
): Promise<AuditLog[]> {
  return await db.getAllAsync<AuditLog>(PROJECT_AUDIT_LOGS_SQL, [folderId, limit, offset]);
}

// -----------------------------------------------------------------------------
// Operaciones del Módulo de Notas (Note_Categories, Notes, Tags & FTS5)
// -----------------------------------------------------------------------------

const NOTE_TAGS_JSON_SUBQUERY = `
  (
    SELECT json_group_array(json_object('id', t.id, 'name', t.name, 'color', t.color))
    FROM Note_Tags nt
    JOIN Tags t ON nt.tag_id = t.id
    WHERE nt.note_id = n.id
  ) AS tags_json
`;

function parseNoteRows(rows: (Note & { tags_json?: string })[]): Note[] {
  return rows.map((r) => {
    let tags: Tag[] = [];
    if (r.tags_json) {
      try {
        const parsed = JSON.parse(r.tags_json);
        if (Array.isArray(parsed)) {
          tags = parsed.filter((t: any) => t && t.id);
        }
      } catch {
        tags = [];
      }
    }
    const { tags_json, ...rest } = r;
    return {
      ...rest,
      tags,
    };
  });
}

export function sanitizeFtsQuery(query: string): string {
  // Limpieza y sanitización de caracteres de control para evitar fallos de sintaxis en FTS5
  const cleaned = query.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
  if (!cleaned) return '';
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  return tokens.map((token) => `"${token}"*`).join(' ');
}

export function getAllTags(): Tag[] {
  return db.getAllSync<Tag>('SELECT * FROM Tags ORDER BY name ASC;');
}

export function createTag(name: string, color = DEFAULT_FOLDER_COLOR): Tag {
  const trimmed = name.trim();
  const existing = db.getFirstSync<Tag>(
    'SELECT * FROM Tags WHERE LOWER(name) = LOWER(?);',
    [trimmed]
  );
  if (existing) return existing;

  const id = generateUUID();
  db.runSync('INSERT INTO Tags (id, name, color) VALUES (?, ?, ?);', [id, trimmed, color]);
  return { id, name: trimmed, color };
}

export function deleteTag(id: string): void {
  db.runSync('DELETE FROM Tags WHERE id = ?;', [id]);
}

export function getNoteTags(noteId: string): Tag[] {
  return db.getAllSync<Tag>(
    `SELECT t.* FROM Tags t
     JOIN Note_Tags nt ON nt.tag_id = t.id
     WHERE nt.note_id = ?
     ORDER BY t.name ASC;`,
    [noteId]
  );
}

export function setNoteTags(noteId: string, tagIds: string[]): void {
  db.runSync('DELETE FROM Note_Tags WHERE note_id = ?;', [noteId]);
  for (const tagId of tagIds) {
    db.runSync('INSERT OR IGNORE INTO Note_Tags (note_id, tag_id) VALUES (?, ?);', [
      noteId,
      tagId,
    ]);
  }
}

export async function setNoteTagsAsync(noteId: string, tagIds: string[]): Promise<void> {
  await db.runAsync('DELETE FROM Note_Tags WHERE note_id = ?;', [noteId]);
  for (const tagId of tagIds) {
    await db.runAsync('INSERT OR IGNORE INTO Note_Tags (note_id, tag_id) VALUES (?, ?);', [
      noteId,
      tagId,
    ]);
  }
}

export function getNotesByTag(tagId: string): Note[] {
  return getNotes(null, false, tagId);
}

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
  return db.getAllSync<NoteCategory>(
    `
    SELECT 
      c.*,
      0 AS subcategories_count,
      (SELECT COUNT(*) FROM Notes n WHERE n.category_id = c.id) AS notes_count
    FROM Note_Categories c
    WHERE c.parent_id = ?
    ORDER BY c.created_at ASC;
  `,
    [parentId]
  );
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
  db.runSync('INSERT INTO Note_Categories (id, parent_id, name) VALUES (?, ?, ?);', [
    id,
    parentId,
    name,
  ]);
  return id;
}

export function deleteNoteCategory(id: string): void {
  db.runSync('DELETE FROM Note_Categories WHERE id = ?;', [id]);
}

function appendCategoryCondition(
  conditions: string[],
  params: any[],
  categoryId?: string | null,
  isMainCategoryWithSubs = false
): void {
  if (categoryId && categoryId !== 'ALL') {
    if (isMainCategoryWithSubs) {
      conditions.push(
        `(n.category_id = ? OR n.category_id IN (SELECT id FROM Note_Categories WHERE parent_id = ?))`
      );
      params.push(categoryId, categoryId);
    } else {
      conditions.push(`n.category_id = ?`);
      params.push(categoryId);
    }
  }
}

export function getNotes(
  categoryId?: string | null,
  isMainCategoryWithSubs = false,
  tagId?: string | null
): Note[] {
  let querySql = `
    SELECT 
      n.*,
      c.name AS category_name,
      ${NOTE_TAGS_JSON_SUBQUERY}
    FROM Notes n
    LEFT JOIN Note_Categories c ON n.category_id = c.id
  `;

  const params: any[] = [];
  const conditions: string[] = [];

  if (tagId) {
    querySql += ` JOIN Note_Tags filter_nt ON filter_nt.note_id = n.id AND filter_nt.tag_id = ? `;
    params.push(tagId);
  }

  appendCategoryCondition(conditions, params, categoryId, isMainCategoryWithSubs);

  if (conditions.length > 0) {
    querySql += ` WHERE ` + conditions.join(' AND ');
  }

  querySql += ` ORDER BY n.is_pinned DESC, n.updated_at DESC;`;

  const rows = db.getAllSync<Note & { tags_json?: string }>(querySql, params);
  return parseNoteRows(rows);
}

/**
 * Búsqueda de Texto Completo ultra-rápida utilizando la tabla virtual SQLite FTS5 y operador MATCH.
 * Soporta filtrado transversal por etiquetas (Tags) y jerarquía de categorías.
 */
export function searchNotes(query: string, options?: SearchNotesOptions): Note[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return getNotes(options?.categoryId, options?.isMainCategoryWithSubs, options?.tagId);
  }

  const ftsMatch = sanitizeFtsQuery(trimmed);
  if (!ftsMatch) {
    return getNotes(options?.categoryId, options?.isMainCategoryWithSubs, options?.tagId);
  }

  const categoryId = options?.categoryId;
  const tagId = options?.tagId;
  const isMainCategoryWithSubs = options?.isMainCategoryWithSubs ?? false;

  let querySql = `
    SELECT 
      n.*,
      c.name AS category_name,
      ${NOTE_TAGS_JSON_SUBQUERY}
    FROM Notes_FTS fts
    JOIN Notes n ON fts.id = n.id
    LEFT JOIN Note_Categories c ON n.category_id = c.id
  `;

  const params: any[] = [];
  const conditions: string[] = ['Notes_FTS MATCH ?'];

  if (tagId) {
    querySql += ` JOIN Note_Tags filter_nt ON filter_nt.note_id = n.id AND filter_nt.tag_id = ? `;
    params.push(tagId);
  }

  params.push(ftsMatch);
  appendCategoryCondition(conditions, params, categoryId, isMainCategoryWithSubs);

  querySql += ` WHERE ` + conditions.join(' AND ');
  querySql += ` ORDER BY bm25(Notes_FTS), n.is_pinned DESC, n.updated_at DESC;`;

  try {
    const rows = db.getAllSync<Note & { tags_json?: string }>(querySql, params);
    return parseNoteRows(rows);
  } catch (err) {
    console.warn('Error en MATCH FTS5, recurriendo a búsqueda de respaldo:', err);
    return fallbackLikeSearch(trimmed, options);
  }
}

export async function searchNotesAsync(
  query: string,
  options?: SearchNotesOptions
): Promise<Note[]> {
  return searchNotes(query, options);
}

function fallbackLikeSearch(query: string, options?: SearchNotesOptions): Note[] {
  const categoryId = options?.categoryId;
  const tagId = options?.tagId;
  const isMainCategoryWithSubs = options?.isMainCategoryWithSubs ?? false;

  let querySql = `
    SELECT 
      n.*,
      c.name AS category_name,
      ${NOTE_TAGS_JSON_SUBQUERY}
    FROM Notes n
    LEFT JOIN Note_Categories c ON n.category_id = c.id
  `;

  const params: any[] = [];
  const conditions: string[] = ['(n.title LIKE ? OR n.content LIKE ?)'];

  if (tagId) {
    querySql += ` JOIN Note_Tags filter_nt ON filter_nt.note_id = n.id AND filter_nt.tag_id = ? `;
    params.push(tagId);
  }

  params.push(`%${query}%`, `%${query}%`);
  appendCategoryCondition(conditions, params, categoryId, isMainCategoryWithSubs);

  querySql += ` WHERE ` + conditions.join(' AND ');
  querySql += ` ORDER BY n.is_pinned DESC, n.updated_at DESC;`;

  const rows = db.getAllSync<Note & { tags_json?: string }>(querySql, params);
  return parseNoteRows(rows);
}

export function getNoteById(id: string): Note | null {
  const row = db.getFirstSync<Note & { tags_json?: string }>(
    `
    SELECT 
      n.*,
      c.name AS category_name,
      ${NOTE_TAGS_JSON_SUBQUERY}
    FROM Notes n
    LEFT JOIN Note_Categories c ON n.category_id = c.id
    WHERE n.id = ?;
  `,
    [id]
  );

  if (!row) return null;
  return parseNoteRows([row])[0];
}

const INSERT_NOTE_SQL = `
  INSERT INTO Notes (id, category_id, title, content, is_pinned, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'));
`;

export function createNote(
  categoryId: string,
  title: string,
  content = '',
  isPinned = false,
  presetId?: string
): string {
  const id = presetId || generateUUID();
  db.runSync(INSERT_NOTE_SQL, [id, categoryId, title, content, isPinned ? 1 : 0]);
  return id;
}

export async function createNoteAsync(
  categoryId: string,
  title: string,
  content = '',
  isPinned = false,
  presetId?: string
): Promise<string> {
  const id = presetId || generateUUID();
  await db.runAsync(INSERT_NOTE_SQL, [id, categoryId, title, content, isPinned ? 1 : 0]);
  return id;
}

function buildUpdateNoteStatement(
  id: string,
  title: string,
  content: string,
  categoryId?: string,
  isPinned?: boolean
): { sql: string; params: any[] } {
  const sets = ['title = ?', 'content = ?', "updated_at = datetime('now', 'localtime')"];
  const params: any[] = [title, content];

  if (categoryId !== undefined) {
    sets.push('category_id = ?');
    params.push(categoryId);
  }
  if (isPinned !== undefined) {
    sets.push('is_pinned = ?');
    params.push(isPinned ? 1 : 0);
  }

  params.push(id);
  return {
    sql: `UPDATE Notes SET ${sets.join(', ')} WHERE id = ?;`,
    params,
  };
}

export function updateNote(
  id: string,
  title: string,
  content: string,
  categoryId?: string,
  isPinned?: boolean
): void {
  const { sql, params } = buildUpdateNoteStatement(id, title, content, categoryId, isPinned);
  db.runSync(sql, params);
}

export async function updateNoteAsync(
  id: string,
  title: string,
  content: string,
  categoryId?: string,
  isPinned?: boolean
): Promise<void> {
  const { sql, params } = buildUpdateNoteStatement(id, title, content, categoryId, isPinned);
  await db.runAsync(sql, params);
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
