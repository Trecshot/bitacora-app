import { AuditLog, TaskStatus, TaskPriority } from '../db/database';
import { MS_PER_DAY } from './dateAndTaskUtils';

export interface RawAuditTriggerLog {
  id?: string | number;
  type?: 'STATUS_TRIGGER' | 'PRIORITY_TRIGGER' | string;
  action?: string;
  entity_type?: 'FOLDER' | 'TASK' | string;
  entity_id?: number;
  task_id?: number | null;
  oldValue?: string | null;
  newValue?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  timestamp: string;
}

export interface ParsedAuditEntry {
  title: string;
  summary: string;
  detail?: string;
  badgeLabel: string;
  badgeType: 'CREATE' | 'STATUS' | 'PRIORITY' | 'UPDATE' | 'DELETE' | 'RESTORE';
}

export interface AuditLogSection {
  title: 'Hoy' | 'Ayer' | 'La semana pasada' | 'Anteriores';
  data: AuditLog[];
}

export const formatStatus = (status?: TaskStatus | string): string => {
  switch (status) {
    case 'TODO':
      return "'Por Hacer'";
    case 'IN_PROGRESS':
      return "'En Progreso'";
    case 'DONE':
      return "'Completado'";
    default:
      return status ? `'${status}'` : "'Desconocido'";
  }
};

export const formatPriority = (priority?: TaskPriority | string): string => {
  switch (priority) {
    case 'HIGH':
      return "'Alta'";
    case 'MEDIUM':
      return "'Media'";
    case 'LOW':
      return "'Baja'";
    default:
      return priority ? `'${priority}'` : "'Normal'";
  }
};

/**
 * Función utilitaria que procesa el diferencial de estado JSON de los triggers de SQLite
 * y lo traduce a lenguaje natural legible para el usuario final.
 */
export const parseAuditLog = (log: RawAuditTriggerLog | AuditLog): string => {
  try {
    const rawOld =
      'oldValue' in log && log.oldValue !== undefined
        ? log.oldValue
        : (log as AuditLog).old_value;
    const rawNew =
      'newValue' in log && log.newValue !== undefined
        ? log.newValue
        : (log as AuditLog).new_value;
    const action = ('action' in log && log.action) || ('type' in log && log.type) || '';
    const entityType = ('entity_type' in log && log.entity_type) || 'TASK';

    const oldState = rawOld ? JSON.parse(rawOld) : null;
    const newState = rawNew ? JSON.parse(rawNew) : null;

    if (
      action === 'SOFT_DELETE' ||
      (oldState && newState && !oldState.is_deleted && newState.is_deleted)
    ) {
      return `Tarea enviada a la papelera (estado: ${formatStatus(
        oldState?.status || newState?.status
      )})`;
    }

    if (
      action === 'RESTORE' ||
      (oldState && newState && oldState.is_deleted && !newState.is_deleted)
    ) {
      return `Tarea restaurada desde la papelera a ${formatStatus(newState?.status)}`;
    }

    // Caso 1: Cambio de estado o prioridad en actualización (ambos estados presentes)
    if (oldState && newState) {
      if (oldState.status !== newState.status) {
        return `Estado actualizado: de ${formatStatus(oldState.status)} a ${formatStatus(
          newState.status
        )}`;
      }
      if (oldState.priority !== newState.priority) {
        return `Prioridad actualizada: de ${formatPriority(
          oldState.priority
        )} a ${formatPriority(newState.priority)}`;
      }
      if (oldState.title && newState.title && oldState.title !== newState.title) {
        return `Título renombrado: de "${oldState.title}" a "${newState.title}"`;
      }
      if (oldState.name && newState.name && oldState.name !== newState.name) {
        return `Carpeta renombrada: de "${oldState.name}" a "${newState.name}"`;
      }
      if (
        oldState.description !== undefined &&
        newState.description !== undefined &&
        oldState.description !== newState.description
      ) {
        return `Contexto o idea de carpeta actualizado`;
      }
      if (entityType === 'FOLDER') {
        return 'Actualización de carpeta registrada';
      }
      return 'Actualización de tarea registrada';
    }

    // Caso 2: Creación (solo newState)
    if (!oldState && newState) {
      if (entityType === 'FOLDER' || newState.name) {
        return `Carpeta creada: "${newState.name || 'Sin nombre'}"`;
      }
      return `Tarea creada en ${formatStatus(newState.status)}`;
    }

    // Caso 3: Eliminación física (solo oldState)
    if (oldState && !newState) {
      if (entityType === 'FOLDER' || oldState.name) {
        return `Carpeta eliminada: "${oldState.name || 'Sin nombre'}"`;
      }
      return `Tarea eliminada permanentemente (último estado: ${formatStatus(oldState.status)})`;
    }

    if (action === 'CREATE') return 'Nuevo registro creado';
    if (action === 'DELETE') return 'Registro eliminado';
    return 'Actualización de tarea registrada';
  } catch {
    return 'Registro de auditoría irrecuperable';
  }
};

/**
 * Devuelve un objeto estructurado con lenguaje natural para enriquecer la tarjeta del historial
 * sin exponer el payload JSON crudo.
 */
export const parseAuditLogEntry = (log: AuditLog): ParsedAuditEntry => {
  const summary = parseAuditLog(log);
  let entityTitle = `${log.entity_type === 'FOLDER' ? 'Carpeta' : 'Tarea'} #${log.entity_id}`;
  let detail: string | undefined;
  let badgeLabel = 'ACTUALIZACIÓN';
  let badgeType: ParsedAuditEntry['badgeType'] = 'UPDATE';

  try {
    const oldState = log.old_value ? JSON.parse(log.old_value) : null;
    const newState = log.new_value ? JSON.parse(log.new_value) : null;

    const itemName = newState?.title || oldState?.title || newState?.name || oldState?.name;
    if (itemName) {
      entityTitle = itemName;
    }

    if (log.action === 'CREATE') {
      badgeLabel = log.entity_type === 'FOLDER' ? 'NUEVA CARPETA' : 'NUEVA TAREA';
      badgeType = 'CREATE';
      if (newState?.priority) {
        detail = `Prioridad inicial asignada: ${formatPriority(newState.priority)}`;
      }
    } else if (
      log.action === 'SOFT_DELETE' ||
      (oldState && newState && !oldState.is_deleted && newState.is_deleted)
    ) {
      badgeLabel = 'PAPELERA (SOFT DELETE)';
      badgeType = 'DELETE';
      detail = 'Se conserva registro íntegro y puede restaurarse.';
    } else if (
      log.action === 'RESTORE' ||
      (oldState && newState && oldState.is_deleted && !newState.is_deleted)
    ) {
      badgeLabel = 'RESTAURADO';
      badgeType = 'RESTORE';
      detail = `Restaurado a la columna ${formatStatus(newState?.status)}`;
    } else if (
      log.action === 'STATUS_CHANGE' ||
      log.action === 'STATUS_TRIGGER' ||
      (oldState && newState && oldState.status !== newState.status)
    ) {
      badgeLabel = 'CAMBIO DE ESTADO';
      badgeType = 'STATUS';
      detail = `Movido de ${formatStatus(oldState?.status)} a ${formatStatus(
        newState?.status
      )}`;
    } else if (
      log.action === 'PRIORITY_CHANGE' ||
      log.action === 'PRIORITY_TRIGGER' ||
      (oldState && newState && oldState.priority !== newState.priority)
    ) {
      badgeLabel = 'PRIORIDAD';
      badgeType = 'PRIORITY';
    } else if (log.action === 'DELETE') {
      badgeLabel = 'ELIMINADO';
      badgeType = 'DELETE';
    }
  } catch {
    // Fallback limpio si el JSON está corrupto
  }

  return {
    title: entityTitle,
    summary,
    detail,
    badgeLabel,
    badgeType,
  };
};

/**
 * Clasifica la marca de tiempo de un registro de auditoría en etiquetas de fecha relativa:
 * "Hoy", "Ayer", "La semana pasada" o "Anteriores".
 */
export function getRelativeDateBucket(
  timestamp: string
): 'Hoy' | 'Ayer' | 'La semana pasada' | 'Anteriores' {
  if (!timestamp) return 'Hoy';
  const normalized = timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T');
  const logDate = new Date(normalized);
  if (Number.isNaN(logDate.getTime())) return 'Hoy';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - MS_PER_DAY;
  const startOfLastWeek = startOfToday - 7 * MS_PER_DAY;

  const logTime = logDate.getTime();
  if (logTime >= startOfToday) {
    return 'Hoy';
  }
  if (logTime >= startOfYesterday) {
    return 'Ayer';
  }
  if (logTime >= startOfLastWeek) {
    return 'La semana pasada';
  }
  return 'Anteriores';
}

/**
 * Agrupa un arreglo de AuditLogs en secciones de fechas relativas para SectionList.
 */
export function groupAuditLogsByRelativeDate(logs: AuditLog[]): AuditLogSection[] {
  const buckets: Record<AuditLogSection['title'], AuditLog[]> = {
    Hoy: [],
    Ayer: [],
    'La semana pasada': [],
    Anteriores: [],
  };

  for (const log of logs) {
    const bucket = getRelativeDateBucket(log.timestamp);
    buckets[bucket].push(log);
  }

  const order: AuditLogSection['title'][] = ['Hoy', 'Ayer', 'La semana pasada', 'Anteriores'];
  return order
    .filter((title) => buckets[title].length > 0)
    .map((title) => ({
      title,
      data: buckets[title],
    }));
}
