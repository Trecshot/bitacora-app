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
  stale_task_count?: number;
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
  is_deleted?: number;
  created_at?: string;
  updated_at?: string;
}

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'STATUS_CHANGE'
  | 'PRIORITY_CHANGE'
  | 'STATUS_TRIGGER'
  | 'PRIORITY_TRIGGER'
  | 'SOFT_DELETE'
  | 'RESTORE'
  | 'DELETE';

export interface AuditLog {
  id: number;
  entity_type: 'FOLDER' | 'TASK';
  entity_id: number;
  folder_id?: number | null;
  task_id?: number | null;
  action: AuditAction;
  old_value: string | null;
  new_value: string | null;
  timestamp: string;
}
