import * as SQLite from 'expo-sqlite';

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

// Instanciar la conexión sincrónica según la arquitectura requerida
export const db = SQLite.openDatabaseSync('bitacora.db');

/**
 * Función de migración inicial:
 * Crea las tablas Folders, Tasks y Audit_Logs, y define los Triggers
 * para auditoría e historial automático a nivel de SQLite.
 */
export function initDatabase(): void {
  // Activar claves foráneas
  db.execSync('PRAGMA foreign_keys = ON;');

  // Migración de Tablas
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

  // Opcional: Insertar datos de muestra si la base de datos está recién inicializada
  seedInitialDataIfEmpty();
}

function seedInitialDataIfEmpty(): void {
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

// Consultas y Operaciones de Folders
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

// Consultas y Operaciones de Tasks
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

// Registro de Auditoría
export function getAuditLogs(limit = 50): AuditLog[] {
  return db.getAllSync<AuditLog>(
    'SELECT * FROM Audit_Logs ORDER BY id DESC LIMIT ?;',
    [limit]
  );
}
