import { create } from 'zustand';
import {
  Task,
  TaskStatus,
  TaskPriority,
  getTasks,
  getDeletedTasks,
  updateTaskStatusAsync,
  createTaskAsync,
  deleteTaskAsync,
  restoreTaskAsync,
  hardDeleteTaskAsync,
} from '../db/database';
import { formatDateOnlyOffset } from '../utils/dateAndTaskUtils';

// Mapa de timers de debounce por tarea para diferir escrituras SQLite
// hasta que la animación de caída (drop) en el UI Thread haya finalizado.
const statusUpdateDebounceMap = new Map<number, ReturnType<typeof setTimeout>>();
const initialStatusSnapshotMap = new Map<number, TaskStatus>();

const DEBOUNCE_SQLITE_MS = 280;

export type DueDateFilter =
  | 'ALL'
  | 'OVERDUE'
  | 'TODAY'
  | 'UPCOMING'
  | 'HAS_DUE_DATE'
  | 'NO_DUE_DATE';

/**
 * Predicado en memoria para filtrado multicriterio apilable (Prioridades + Fecha Límite)
 * sin requerir nuevas consultas a SQLite.
 */
export function filterTasksByCriteria(
  tasks: Task[],
  selectedPriorities: TaskPriority[],
  dueDateFilter: DueDateFilter
): Task[] {
  const todayStr = formatDateOnlyOffset(0);

  return tasks.filter((task) => {
    // 1. Predicado de Prioridades apilables (si hay al menos una seleccionada)
    if (selectedPriorities.length > 0 && !selectedPriorities.includes(task.priority)) {
      return false;
    }

    // 2. Predicado de Fecha Límite (due_date)
    if (dueDateFilter === 'ALL') {
      return true;
    }

    const dueDate = task.due_date ? task.due_date.substring(0, 10) : null;

    switch (dueDateFilter) {
      case 'NO_DUE_DATE':
        return !dueDate;
      case 'HAS_DUE_DATE':
        return Boolean(dueDate);
      case 'OVERDUE':
        return Boolean(dueDate && dueDate < todayStr && task.status !== 'DONE');
      case 'TODAY':
        return Boolean(dueDate && dueDate === todayStr);
      case 'UPCOMING':
        return Boolean(dueDate && dueDate > todayStr);
      default:
        return true;
    }
  });
}

interface KanbanStoreState {
  tasks: Task[];
  deletedTasks: Task[];
  lastDeletedTask: Task | null;
  activeFolderId: number | null;
  isLoading: boolean;
  error: string | null;

  // Filtros apilables en memoria (sin consultas adicionales a SQLite)
  selectedPriorities: TaskPriority[];
  dueDateFilter: DueDateFilter;

  // Acciones de carga
  loadTasksForFolder: (folderId: number) => void;

  // Acciones de filtrado en memoria
  togglePriorityFilter: (priority: TaskPriority) => void;
  setDueDateFilter: (filter: DueDateFilter) => void;
  clearFilters: () => void;

  // 1. Actualización instantánea en UI + Persistencia SQLite asíncrona diferida (debounce)
  moveTaskStatusOptimistic: (taskId: number, newStatus: TaskStatus) => Promise<void>;

  // 2. Creación instantánea (Optimistic UI) con persistencia en segundo plano
  createTaskOptimistic: (
    folderId: number,
    title: string,
    description: string,
    status: TaskStatus,
    priority: TaskPriority,
    dueDate?: string | null
  ) => Promise<void>;

  // 3. Borrado Lógico instantáneo (Soft Delete: is_deleted = 1) con opción Deshacer
  deleteTaskOptimistic: (taskId: number) => Promise<void>;

  // 4. Restauración instantánea desde Papelera o botón Deshacer (is_deleted = 0)
  restoreTaskOptimistic: (taskId: number) => Promise<void>;

  // 5. Eliminación física definitiva desde la Papelera de Reciclaje
  hardDeleteTaskOptimistic: (taskId: number) => Promise<void>;

  dismissLastDeleted: () => void;
}

export const useKanbanStore = create<KanbanStoreState>((set, get) => ({
  tasks: [],
  deletedTasks: [],
  lastDeletedTask: null,
  activeFolderId: null,
  isLoading: false,
  error: null,
  selectedPriorities: [],
  dueDateFilter: 'ALL',

  loadTasksForFolder: (folderId: number) => {
    try {
      set({ isLoading: true, activeFolderId: folderId, error: null });
      const currentTasks = getTasks(folderId);
      const currentDeleted = getDeletedTasks(folderId);
      set({
        tasks: currentTasks,
        deletedTasks: currentDeleted,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err?.message || 'Error cargando tareas', isLoading: false });
    }
  },

  togglePriorityFilter: (priority: TaskPriority) => {
    const current = get().selectedPriorities;
    const exists = current.includes(priority);
    set({
      selectedPriorities: exists
        ? current.filter((p) => p !== priority)
        : [...current, priority],
    });
  },

  setDueDateFilter: (filter: DueDateFilter) => {
    set({ dueDateFilter: filter });
  },

  clearFilters: () => {
    set({ selectedPriorities: [], dueDateFilter: 'ALL' });
  },

  dismissLastDeleted: () => {
    set({ lastDeletedTask: null });
  },

  /**
   * Actualización instantánea en memoria (Optimistic UI) combinada con
   * escritura SQLite asíncrona y diferida (debounce) para no bloquear
   * los 60 FPS de la animación mientras la tarjeta está en el aire.
   */
  moveTaskStatusOptimistic: async (taskId: number, newStatus: TaskStatus) => {
    const currentTasks = get().tasks;
    const taskToUpdate = currentTasks.find((t) => t.id === taskId);
    if (!taskToUpdate || taskToUpdate.status === newStatus) return;

    // Preservar el estado original previo a una ráfaga de movimientos para rollback seguro
    if (!initialStatusSnapshotMap.has(taskId)) {
      initialStatusSnapshotMap.set(taskId, taskToUpdate.status);
    }

    // 1. ACTUALIZACIÓN INSTANTÁNEA en memoria (Latencia 0 ms)
    set({
      tasks: currentTasks.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus, updated_at: new Date().toISOString() }
          : t
      ),
    });

    // 2. Cancelar cualquier transacción pendiente para la misma tarea (debounce)
    const existingTimer = statusUpdateDebounceMap.get(taskId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 3. Diferir la escritura en SQLite hasta que concluya la transición visual en el UI Thread
    return new Promise<void>((resolve) => {
      const timer = setTimeout(async () => {
        statusUpdateDebounceMap.delete(taskId);
        const rollbackStatus = initialStatusSnapshotMap.get(taskId);
        initialStatusSnapshotMap.delete(taskId);

        try {
          await updateTaskStatusAsync(taskId, newStatus);
          resolve();
        } catch (err: any) {
          console.error('Fallo en SQLite diferido, revirtiendo estado:', err);
          if (rollbackStatus) {
            set({
              tasks: get().tasks.map((t) =>
                t.id === taskId ? { ...t, status: rollbackStatus } : t
              ),
              error: 'No se pudo sincronizar el cambio de estado con SQLite',
            });
          }
          resolve();
        }
      }, DEBOUNCE_SQLITE_MS);

      statusUpdateDebounceMap.set(taskId, timer);
    });
  },

  createTaskOptimistic: async (
    folderId,
    title,
    description,
    status,
    priority,
    dueDate = null
  ) => {
    const previousTasks = get().tasks;
    const tempId = -Date.now();
    const nowIso = new Date().toISOString();
    const optimisticTask: Task = {
      id: tempId,
      folder_id: folderId,
      title,
      description,
      status,
      priority,
      due_date: dueDate,
      is_deleted: 0,
      created_at: nowIso,
      updated_at: nowIso,
    };

    // Actualización inmediata
    set({ tasks: [optimisticTask, ...previousTasks] });

    try {
      const realId = await createTaskAsync(
        folderId,
        title,
        description,
        status,
        priority,
        dueDate
      );
      set({
        tasks: get().tasks.map((t) => (t.id === tempId ? { ...t, id: realId } : t)),
      });
    } catch (err: any) {
      console.error('Error insertando tarea en segundo plano:', err);
      set({
        tasks: previousTasks,
        error: 'Error al registrar tarea en segundo plano',
      });
    }
  },

  deleteTaskOptimistic: async (taskId: number) => {
    const existingTimer = statusUpdateDebounceMap.get(taskId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      statusUpdateDebounceMap.delete(taskId);
      initialStatusSnapshotMap.delete(taskId);
    }

    const previousTasks = get().tasks;
    const previousDeleted = get().deletedTasks;
    const targetTask = previousTasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const softDeletedTask: Task = {
      ...targetTask,
      is_deleted: 1,
      updated_at: new Date().toISOString(),
    };

    set({
      tasks: previousTasks.filter((t) => t.id !== taskId),
      deletedTasks: [softDeletedTask, ...previousDeleted],
      lastDeletedTask: softDeletedTask,
    });

    try {
      await deleteTaskAsync(taskId);
    } catch (err: any) {
      console.error('Error aplicando borrado lógico en segundo plano:', err);
      set({
        tasks: previousTasks,
        deletedTasks: previousDeleted,
        lastDeletedTask: null,
        error: 'Error al mover tarea a la papelera en SQLite',
      });
    }
  },

  restoreTaskOptimistic: async (taskId: number) => {
    const previousTasks = get().tasks;
    const previousDeleted = get().deletedTasks;
    const targetTask =
      previousDeleted.find((t) => t.id === taskId) ||
      (get().lastDeletedTask?.id === taskId ? get().lastDeletedTask : null);

    if (!targetTask) return;

    const restoredTask: Task = {
      ...targetTask,
      is_deleted: 0,
      updated_at: new Date().toISOString(),
    };

    set({
      tasks: [restoredTask, ...previousTasks.filter((t) => t.id !== taskId)],
      deletedTasks: previousDeleted.filter((t) => t.id !== taskId),
      lastDeletedTask:
        get().lastDeletedTask?.id === taskId ? null : get().lastDeletedTask,
    });

    try {
      await restoreTaskAsync(taskId);
    } catch (err: any) {
      console.error('Error restaurando tarea desde papelera:', err);
      set({
        tasks: previousTasks,
        deletedTasks: previousDeleted,
        error: 'No se pudo restaurar la tarea',
      });
    }
  },

  hardDeleteTaskOptimistic: async (taskId: number) => {
    const previousDeleted = get().deletedTasks;
    set({
      deletedTasks: previousDeleted.filter((t) => t.id !== taskId),
      lastDeletedTask:
        get().lastDeletedTask?.id === taskId ? null : get().lastDeletedTask,
    });

    try {
      await hardDeleteTaskAsync(taskId);
    } catch (err: any) {
      console.error('Error eliminando tarea permanentemente:', err);
      set({
        deletedTasks: previousDeleted,
        error: 'No se pudo eliminar permanentemente la tarea',
      });
    }
  },
}));
