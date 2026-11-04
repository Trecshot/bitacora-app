import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import {
  Plus,
  FolderPlus,
  Folder as FolderIcon,
  CheckCircle2,
  ListTodo,
  Layers,
  Kanban as KanbanIcon,
  LayoutList,
} from 'lucide-react-native';
import {
  getFolderById,
  getFolders,
  createFolder,
  deleteFolder,
  Folder,
  TaskStatus,
  TaskPriority,
} from '../../src/db/database';
import { useKanbanStore } from '../../src/store/useKanbanStore';
import { FolderCard } from '../../src/components/FolderCard';
import { OptimizedKanbanCard } from '../../src/components/OptimizedKanbanCard';
import { KanbanBoardView } from '../../src/components/KanbanBoardView';
import { CreateFolderModal } from '../../src/components/CreateFolderModal';
import { CreateTaskModal } from '../../src/components/CreateTaskModal';
import { DebugTelemetry } from '../../src/components/DebugTelemetry';
import { ProjectContextSection } from '../../src/components/ProjectContextSection';
import { ProjectHistorySection } from '../../src/components/ProjectHistorySection';

type FilterTab = 'ALL' | 'TODO' | 'IN_PROGRESS' | 'DONE';
type ViewMode = 'KANBAN' | 'LIST';

export default function FolderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const folderId = Number(id);

  const [folder, setFolder] = useState<Folder | null>(null);
  const [subfolders, setSubfolders] = useState<Folder[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('KANBAN');
  const [refreshing, setRefreshing] = useState(false);
  const [secretDevMenuUnlocked, setSecretDevMenuUnlocked] = useState(false);

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [initialTaskStatus, setInitialTaskStatus] = useState<TaskStatus>('TODO');

  const {
    tasks,
    loadTasksForFolder,
    moveTaskStatusOptimistic,
    createTaskOptimistic,
    deleteTaskOptimistic,
  } = useKanbanStore();

  const loadData = useCallback(() => {
    if (!folderId) return;
    try {
      const currentFolder = getFolderById(folderId);
      setFolder(currentFolder);

      const subs = getFolders(folderId);
      setSubfolders(subs);

      loadTasksForFolder(folderId);
    } catch (e) {
      console.error('Error cargando detalle de carpeta:', e);
    }
  }, [folderId, loadTasksForFolder]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  const handleCreateSubfolder = (name: string, color: string, description = '') => {
    try {
      createFolder(name, folderId, color, description);
      loadData();
    } catch (e) {
      Alert.alert('Error', 'No se pudo crear la subcarpeta.');
    }
  };

  const handleCreateTask = async (
    title: string,
    description: string,
    priority: TaskPriority,
    status: TaskStatus
  ) => {
    try {
      await createTaskOptimistic(folderId, title, description, status, priority);
    } catch (e) {
      Alert.alert('Error', 'No se pudo registrar la tarea.');
    }
  };

  const handleStatusChange = (taskId: number, nextStatus: TaskStatus) => {
    moveTaskStatusOptimistic(taskId, nextStatus);
  };

  const handleDeleteTask = (taskId: number) => {
    Alert.alert(
      'Eliminar Tarea',
      '¿Deseas eliminar esta tarea de forma permanente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteTaskOptimistic(taskId);
          },
        },
      ]
    );
  };

  const handleDeleteSubfolder = (subfolderId: number) => {
    Alert.alert(
      'Eliminar Subcarpeta',
      '¿Deseas eliminar esta subcarpeta y todo su contenido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            try {
              deleteFolder(subfolderId);
              loadData();
            } catch (e) {
              Alert.alert('Error', 'No se pudo eliminar la subcarpeta.');
            }
          },
        },
      ]
    );
  };

  const openCreateTaskForStatus = (status: TaskStatus) => {
    setInitialTaskStatus(status);
    setIsTaskModalOpen(true);
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'ALL') return true;
    return t.status === activeTab;
  });

  const countTodo = tasks.filter((t) => t.status === 'TODO').length;
  const countInProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const countDone = tasks.filter((t) => t.status === 'DONE').length;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Stack.Screen
        options={{
          title: folder?.name || 'Carpeta',
          headerBackTitle: 'Atrás',
        }}
      />

      <ScrollView
        className="flex-1 px-4 pt-3"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
        }
      >
        {/* Cabecera de la Carpeta */}
        <View className="bg-white rounded-3xl p-5 mb-4 border border-slate-200/80 shadow-sm">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1 mr-2">
              <TouchableOpacity
                activeOpacity={0.8}
                delayLongPress={800}
                onLongPress={() => setSecretDevMenuUnlocked((prev) => !prev)}
                className="w-12 h-12 rounded-2xl items-center justify-center mr-3"
                style={{ backgroundColor: `${folder?.color || '#3B82F6'}18` }}
              >
                <FolderIcon size={24} color={folder?.color || '#3B82F6'} />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-xl font-bold text-slate-800" numberOfLines={1}>
                  {folder?.name || 'Cargando...'}
                </Text>
                <Text className="text-xs text-slate-400 mt-0.5">
                  Creado {folder?.created_at?.split(' ')[0] || ''}
                  {folder?.depth ? ` • Nivel ${folder.depth}` : ''}
                </Text>
              </View>
            </View>
          </View>

          {/* Resumen de Estado del Tablero Kanban */}
          <View className="flex-row justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <View className="flex-1 items-center py-1">
              <Text className="text-xs text-slate-500 font-medium">Por Hacer</Text>
              <Text className="text-base font-bold text-slate-700">{countTodo}</Text>
            </View>
            <View className="w-[1px] bg-slate-200 my-1" />
            <View className="flex-1 items-center py-1">
              <Text className="text-xs text-amber-600 font-medium">En Progreso</Text>
              <Text className="text-base font-bold text-amber-700">{countInProgress}</Text>
            </View>
            <View className="w-[1px] bg-slate-200 my-1" />
            <View className="flex-1 items-center py-1">
              <Text className="text-xs text-emerald-600 font-medium">Completadas</Text>
              <Text className="text-base font-bold text-emerald-700">{countDone}</Text>
            </View>
          </View>

          {/* Telemetría encapsulada exclusivamente para modo desarrollo (__DEV__) o menú oculto */}
          <DebugTelemetry
            visibleBySecretMenu={secretDevMenuUnlocked}
            folderDepth={folder?.depth}
            totalNestedTasks={folder?.task_count}
          />
        </View>

        {/* Sección Expandible: Bloque de Contexto / Idea del Proyecto con Markdown y Edición In-Situ */}
        <ProjectContextSection
          folderId={folderId}
          initialDescription={folder?.description}
          onDescriptionSaved={(newDesc) => {
            setFolder((prev) => (prev ? { ...prev, description: newDesc } : prev));
          }}
        />

        {/* Bloque de Historial de Actividad Acotado (Lazy Loading + Paginación) */}
        <ProjectHistorySection folderId={folderId} />

        {/* Sección: Subcarpetas */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Layers size={16} color="#64748B" />
              <Text className="text-sm font-bold text-slate-700 ml-1.5">
                Subcarpetas ({subfolders.length})
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsFolderModalOpen(true)}
              className="flex-row items-center bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
            >
              <FolderPlus size={13} color="#2563EB" />
              <Text className="text-xs font-semibold text-blue-700 ml-1">Nueva</Text>
            </TouchableOpacity>
          </View>

          {subfolders.map((sub) => (
            <FolderCard
              key={sub.id}
              folder={sub}
              onPress={() => router.push(`/folder/${sub.id}`)}
              onDelete={handleDeleteSubfolder}
            />
          ))}
        </View>

        {/* Sección: Tareas (Tablero Kanban Optimizado) */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <ListTodo size={16} color="#64748B" />
              <Text className="text-sm font-bold text-slate-700 ml-1.5">
                Tablero Kanban ({tasks.length})
              </Text>
            </View>

            <View className="flex-row items-center space-x-2">
              <View className="flex-row bg-slate-200/80 p-0.5 rounded-xl mr-2">
                <TouchableOpacity
                  onPress={() => setViewMode('KANBAN')}
                  className={`p-1.5 rounded-lg ${
                    viewMode === 'KANBAN' ? 'bg-white shadow-sm' : ''
                  }`}
                >
                  <KanbanIcon
                    size={15}
                    color={viewMode === 'KANBAN' ? '#1E293B' : '#64748B'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setViewMode('LIST')}
                  className={`p-1.5 rounded-lg ${
                    viewMode === 'LIST' ? 'bg-white shadow-sm' : ''
                  }`}
                >
                  <LayoutList
                    size={15}
                    color={viewMode === 'LIST' ? '#1E293B' : '#64748B'}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => openCreateTaskForStatus('TODO')}
                className="flex-row items-center bg-emerald-600 px-3 py-1.5 rounded-xl shadow-sm shadow-emerald-600/20"
              >
                <Plus size={14} color="#FFFFFF" />
                <Text className="text-xs font-semibold text-white ml-1">Nueva Tarea</Text>
              </TouchableOpacity>
            </View>
          </View>

          {viewMode === 'KANBAN' ? (
            <KanbanBoardView
              tasks={tasks}
              onMoveStatus={handleStatusChange}
              onDeleteTask={handleDeleteTask}
              onOpenCreateTask={openCreateTaskForStatus}
            />
          ) : (
            <View>
              <View className="flex-row space-x-1.5 bg-slate-200/60 p-1 rounded-xl mb-3">
                {[
                  { id: 'ALL', label: 'Todas' },
                  { id: 'TODO', label: 'Por Hacer' },
                  { id: 'IN_PROGRESS', label: 'En Progreso' },
                  { id: 'DONE', label: 'Completado' },
                ].map((tab) => (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id as FilterTab)}
                    className={`flex-1 py-1.5 rounded-lg items-center ${
                      activeTab === tab.id ? 'bg-white shadow-sm' : ''
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        activeTab === tab.id ? 'text-slate-800' : 'text-slate-500'
                      }`}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {filteredTasks.length === 0 ? (
                <View className="py-10 bg-white rounded-2xl border border-slate-100 items-center justify-center p-4">
                  <CheckCircle2 size={32} color="#CBD5E1" />
                  <Text className="text-sm font-semibold text-slate-600 mt-2">
                    No hay tareas en esta sección
                  </Text>
                </View>
              ) : (
                filteredTasks.map((task) => (
                  <OptimizedKanbanCard
                    key={task.id}
                    task={task}
                    onMoveStatus={handleStatusChange}
                    onDelete={handleDeleteTask}
                  />
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <CreateFolderModal
        visible={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSubmit={handleCreateSubfolder}
      />

      <CreateTaskModal
        visible={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleCreateTask}
        defaultStatus={initialTaskStatus}
      />
    </SafeAreaView>
  );
}
