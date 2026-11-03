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

interface KanbanStoreState {
  tasks: Task[];
  activeFolderId: number | null;
  isLoading: boolean;
  error: string | null;

  // Acciones de carga
  loadTasksForFolder: (folderId: number) => void;

  // 1. Actualización instantánea de la interfaz gráfica (Optimistic UI)
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
   * Actualización instantánea de la interfaz gráfica antes de la confirmación
   * de la base de datos (Patrón Optimistic UI) para eliminar la latencia percibida.
   */
  moveTaskStatusOptimistic: async (taskId: number, newStatus: TaskStatus) => {
    const previousTasks = get().tasks;
    const taskToUpdate = previousTasks.find((t) => t.id === taskId);
    if (!taskToUpdate || taskToUpdate.status === newStatus) return;

    const previousStatus = taskToUpdate.status;

    // 1. ACTUALIZACIÓN INSTANTÁNEA en memoria (Latencia 0 ms)
    set({
      tasks: previousTasks.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus, updated_at: new Date().toISOString() }
          : t
      ),
    });

    try {
      // 2. Transacción SQLite asíncrona en segundo plano (Modo WAL)
      await updateTaskStatusAsync(taskId, newStatus);
    } catch (err: any) {
      // 3. Rollback automático en caso de fallo en la base de datos
      console.error('Fallo en SQLite en segundo plano, revirtiendo estado:', err);
      set({
        tasks: previousTasks.map((t) =>
          t.id === taskId ? { ...t, status: previousStatus } : t
        ),
        error: 'No se pudo sincronizar el cambio de estado con SQLite',
      });
    }
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
      // Asignar ID generado por SQLite y triggers
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
    const previousTasks = get().tasks;
    // Eliminación inmediata
    set({ tasks: previousTasks.filter((t) => t.id !== taskId) });

    try {
      await deleteTaskAsync(taskId);
    } catch (err: any) {
      console.error('Error eliminando tarea en segundo plano:', err);
      set({ tasks: previousTasks, error: 'Error al eliminar tarea en SQLite' });
    }
  },
}));
