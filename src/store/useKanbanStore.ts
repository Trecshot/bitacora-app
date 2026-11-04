import { create } from 'zustand';
import {
  Task,
  TaskStatus,
  TaskPriority,
  getTasks,
  updateTaskStatusAsync,
  createTaskAsync,
  deleteTaskAsync,
} from '../db/database';

// Mapa de timers de debounce por tarea para diferir escrituras SQLite
// hasta que la animación de caída (drop) en el UI Thread haya finalizado.
const statusUpdateDebounceMap = new Map<number, ReturnType<typeof setTimeout>>();
const initialStatusSnapshotMap = new Map<number, TaskStatus>();

const DEBOUNCE_SQLITE_MS = 280;

interface KanbanStoreState {
  tasks: Task[];
  activeFolderId: number | null;
  isLoading: boolean;
  error: string | null;

  // Acciones de carga
  loadTasksForFolder: (folderId: number) => void;

  // 1. Actualización instantánea en UI + Persistencia SQLite asíncrona diferida (debounce)
  moveTaskStatusOptimistic: (taskId: number, newStatus: TaskStatus) => Promise<void>;

  // 2. Creación instantánea (Optimistic UI) con persistencia en segundo plano
  createTaskOptimistic: (
    folderId: number,
    title: string,
    description: string,
    status: TaskStatus,
    priority: TaskPriority
  ) => Promise<void>;

  // 3. Eliminación instantánea (Optimistic UI) con resolución de promesas
  deleteTaskOptimistic: (taskId: number) => Promise<void>;
}

export const useKanbanStore = create<KanbanStoreState>((set, get) => ({
  tasks: [],
  activeFolderId: null,
  isLoading: false,
  error: null,

  loadTasksForFolder: (folderId: number) => {
    try {
      set({ isLoading: true, activeFolderId: folderId, error: null });
      const currentTasks = getTasks(folderId);
      set({ tasks: currentTasks, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Error cargando tareas', isLoading: false });
    }
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

  createTaskOptimistic: async (folderId, title, description, status, priority) => {
    const previousTasks = get().tasks;
    const tempId = -Date.now();
    const optimisticTask: Task = {
      id: tempId,
      folder_id: folderId,
      title,
      description,
      status,
      priority,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Actualización inmediata
    set({ tasks: [optimisticTask, ...previousTasks] });

    try {
      const realId = await createTaskAsync(folderId, title, description, status, priority);
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
    set({ tasks: previousTasks.filter((t) => t.id !== taskId) });

    try {
      await deleteTaskAsync(taskId);
    } catch (err: any) {
      console.error('Error eliminando tarea en segundo plano:', err);
      set({ tasks: previousTasks, error: 'Error al eliminar tarea en SQLite' });
    }
  },
}));
