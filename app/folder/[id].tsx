import React, { useState, useCallback, useMemo, useRef } from 'react';
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
  ChevronRight,
  Home,
  Filter,
  RotateCcw,
  Trash2,
  X,
  AlertTriangle,
  Calendar,
} from 'lucide-react-native';
import {
  getFolderById,
  getFolders,
  getFolderBreadcrumbs,
  createFolder,
  deleteFolder,
  Folder,
  TaskStatus,
  TaskPriority,
} from '../../src/db/database';
import {
  useKanbanStore,
  filterTasksByCriteria,
  DueDateFilter,
} from '../../src/store/useKanbanStore';
import { FolderCard } from '../../src/components/FolderCard';
import { OptimizedKanbanCard } from '../../src/components/OptimizedKanbanCard';
import { KanbanBoardView } from '../../src/components/KanbanBoardView';
import { CreateFolderModal } from '../../src/components/CreateFolderModal';
import { CreateTaskModal } from '../../src/components/CreateTaskModal';
import { DebugTelemetry } from '../../src/components/DebugTelemetry';
import { ProjectContextSection } from '../../src/components/ProjectContextSection';
import { ProjectHistorySection } from '../../src/components/ProjectHistorySection';
import { useTheme } from '../../src/theme/ThemeContext';
import { ThemeSelectorPill } from '../../src/components/ThemeSelectorPill';

type FilterTab = 'ALL' | 'TODO' | 'IN_PROGRESS' | 'DONE';
type ViewMode = 'KANBAN' | 'LIST';

const PRIORITY_FILTERS: { id: TaskPriority; label: string; activeClass: string }[] = [
  { id: 'HIGH', label: 'Alta', activeClass: 'bg-rose-600 border-rose-600' },
  { id: 'MEDIUM', label: 'Media', activeClass: 'bg-amber-500 border-amber-500' },
  { id: 'LOW', label: 'Baja', activeClass: 'bg-blue-600 border-blue-600' },
];

const DUE_DATE_FILTERS: { id: DueDateFilter; label: string }[] = [
  { id: 'ALL', label: 'Todas las fechas' },
  { id: 'OVERDUE', label: 'Vencidas' },
  { id: 'TODAY', label: 'Hoy' },
  { id: 'UPCOMING', label: 'Próximas' },
  { id: 'HAS_DUE_DATE', label: 'Con fecha' },
  { id: 'NO_DUE_DATE', label: 'Sin fecha' },
];

export default function FolderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const folderId = Number(id);
  const breadcrumbScrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const { theme } = useTheme();

  const [folder, setFolder] = useState<Folder | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Folder[]>([]);
  const [subfolders, setSubfolders] = useState<Folder[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('KANBAN');
  const [refreshing, setRefreshing] = useState(false);
  const [secretDevMenuUnlocked, setSecretDevMenuUnlocked] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [initialTaskStatus, setInitialTaskStatus] = useState<TaskStatus>('TODO');

  const {
    tasks,
    deletedTasks,
    lastDeletedTask,
    selectedPriorities,
    dueDateFilter,
    loadTasksForFolder,
    togglePriorityFilter,
    setDueDateFilter,
    clearFilters,
    moveTaskStatusOptimistic,
    createTaskOptimistic,
    deleteTaskOptimistic,
    restoreTaskOptimistic,
    hardDeleteTaskOptimistic,
    dismissLastDeleted,
  } = useKanbanStore();

  const loadData = useCallback(() => {
    if (!folderId) return;
    try {
      const currentFolder = getFolderById(folderId);
      setFolder(currentFolder);

      const crumbs = getFolderBreadcrumbs(folderId);
      setBreadcrumbs(crumbs);

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
      // Usa el color seleccionado o hereda automáticamente el color hexadecimal del nodo padre
      const resolvedColor = color || folder?.color || '#3B82F6';
      createFolder(name, folderId, resolvedColor, description);
      loadData();
    } catch {
      Alert.alert('Error', 'No se pudo crear la subcarpeta.');
    }
  };

  const handleCreateTask = async (
    title: string,
    description: string,
    priority: TaskPriority,
    status: TaskStatus,
    dueDate: string | null
  ) => {
    try {
      await createTaskOptimistic(folderId, title, description, status, priority, dueDate);
      loadData();
    } catch {
      Alert.alert('Error', 'No se pudo registrar la tarea.');
    }
  };

  const handleStatusChange = (taskId: number, nextStatus: TaskStatus) => {
    moveTaskStatusOptimistic(taskId, nextStatus);
  };

  /**
   * Borrado Lógico (Soft Delete):
   * Envía la tarea a la Papelera de Reciclaje (is_deleted = 1) preservando el historial
   * de auditoría y habilitando acción inmediata de "Deshacer".
   */
  const handleDeleteTask = (taskId: number) => {
    Alert.alert(
      'Mover a la Papelera',
      'La tarea se ocultará del tablero conservando su trazabilidad en la auditoría. Podrás restaurarla cuando quieras desde la Papelera de reciclaje.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Mover a Papelera',
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
            } catch {
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

  // Filtrado Multicriterio apilable en memoria sobre el estado de Zustand (0 consultas SQLite)
  const criteriaFilteredTasks = useMemo(() => {
    return filterTasksByCriteria(tasks, selectedPriorities, dueDateFilter);
  }, [tasks, selectedPriorities, dueDateFilter]);

  const listFilteredTasks = useMemo(() => {
    if (activeTab === 'ALL') return criteriaFilteredTasks;
    return criteriaFilteredTasks.filter((t) => t.status === activeTab);
  }, [criteriaFilteredTasks, activeTab]);

  const hasActiveFilters = selectedPriorities.length > 0 || dueDateFilter !== 'ALL';
  const activeFilterCount =
    selectedPriorities.length + (dueDateFilter !== 'ALL' ? 1 : 0);

  const countTodo = criteriaFilteredTasks.filter((t) => t.status === 'TODO').length;
  const countInProgress = criteriaFilteredTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const countDone = criteriaFilteredTasks.filter((t) => t.status === 'DONE').length;
  const staleCount = folder?.stale_task_count ?? 0;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      {/* Cabecera reemplazada por Navegación por Migas de Pan (Breadcrumbs) en ScrollView horizontal */}
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerTitle: () => (
            <ScrollView
              ref={breadcrumbScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onContentSizeChange={() =>
                breadcrumbScrollRef.current?.scrollToEnd({ animated: true })
              }
              contentContainerStyle={{ alignItems: 'center', paddingRight: 16 }}
            >
              <TouchableOpacity
                onPress={() => router.navigate('/')}
                className="flex-row items-center px-2.5 py-1.5 rounded-xl border"
                style={{
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                }}
              >
                <Home size={13} color={theme.colors.accent} />
                <Text
                  className="text-xs font-bold ml-1"
                  style={{ color: theme.colors.text }}
                >
                  Proyectos
                </Text>
              </TouchableOpacity>

              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                const crumbColor = crumb.color || theme.colors.accent;
                return (
                  <View key={crumb.id} className="flex-row items-center">
                    <View className="mx-1">
                      <ChevronRight size={14} color={theme.colors.textMuted} />
                    </View>
                    <TouchableOpacity
                      disabled={isLast}
                      onPress={() => router.push(`/folder/${crumb.id}`)}
                      className="flex-row items-center px-2.5 py-1.5 rounded-xl border"
                      style={{
                        backgroundColor: isLast ? theme.colors.surfaceElevated : theme.colors.surface,
                        borderColor: isLast ? theme.colors.accent : theme.colors.border,
                      }}
                    >
                      <View
                        className="w-2 h-2 rounded-full mr-1.5"
                        style={{ backgroundColor: crumbColor }}
                      />
                      <Text
                        className="text-xs"
                        style={{
                          fontWeight: isLast ? '700' : '600',
                          color: isLast ? theme.colors.accent : theme.colors.textSecondary,
                        }}
                        numberOfLines={1}
                      >
                        {crumb.name}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          ),
        }}
      />

      {/* Banner flotante de Deshacer Borrado Lógico (Soft Delete) */}
      {lastDeletedTask && lastDeletedTask.folder_id === folderId && (
        <View
          className="mx-4 mt-2 px-3.5 py-2.5 rounded-2xl flex-row items-center justify-between border"
          style={{
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
          }}
        >
          <View className="flex-1 mr-2">
            <Text
              className="text-xs font-semibold"
              style={{ color: theme.colors.text }}
              numberOfLines={1}
            >
              En papelera: &quot;{lastDeletedTask.title}&quot;
            </Text>
            <Text className="text-[10px]" style={{ color: theme.colors.textMuted }}>
              Registro conservado en auditoría (Soft Delete)
            </Text>
          </View>
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => restoreTaskOptimistic(lastDeletedTask.id)}
              className="flex-row items-center px-3 py-1.5 rounded-xl mr-1.5"
              style={{ backgroundColor: theme.colors.success }}
            >
              <RotateCcw size={12} color="#FFFFFF" />
              <Text className="text-xs font-bold text-white ml-1">Deshacer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={dismissLastDeleted} className="p-1">
              <X size={15} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        className="flex-1 px-4 pt-3"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
          />
        }
      >
        {/* Cabecera de la Carpeta */}
        <View style={[theme.cardStyle, { padding: 18, marginBottom: 16 }]}>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1 mr-2">
              <TouchableOpacity
                activeOpacity={0.8}
                delayLongPress={800}
                onLongPress={() => setSecretDevMenuUnlocked((prev) => !prev)}
                className="w-12 h-12 rounded-2xl items-center justify-center mr-3"
                style={{ backgroundColor: `${folder?.color || theme.colors.accent}18` }}
              >
                <FolderIcon size={24} color={folder?.color || theme.colors.accent} />
              </TouchableOpacity>
              <View className="flex-1">
                <Text
                  className="text-xl font-bold"
                  style={{ color: theme.colors.text }}
                  numberOfLines={1}
                >
                  {folder?.name || 'Cargando...'}
                </Text>
                <Text
                  className="text-xs mt-0.5"
                  style={{ color: theme.colors.textMuted }}
                  numberOfLines={1}
                >
                  {breadcrumbs.map((b) => b.name).join(' / ') || 'Raíz'}
                  {folder?.depth ? ` • Nivel ${folder.depth}` : ''}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              {/* Botón de Papelera de Reciclaje (Soft Deletes) */}
              <TouchableOpacity
                onPress={() => setShowRecycleBin((prev) => !prev)}
                className="flex-row items-center px-2.5 py-1.5 rounded-xl border mr-2"
                style={{
                  backgroundColor:
                    showRecycleBin || deletedTasks.length > 0
                      ? 'rgba(225, 29, 72, 0.12)'
                      : theme.colors.surfaceElevated,
                  borderColor:
                    showRecycleBin || deletedTasks.length > 0
                      ? 'rgba(225, 29, 72, 0.3)'
                      : theme.colors.border,
                }}
              >
                <Trash2
                  size={13}
                  color={
                    showRecycleBin || deletedTasks.length > 0
                      ? '#E11D48'
                      : theme.colors.textMuted
                  }
                />
                <Text
                  className="text-xs font-bold ml-1"
                  style={{
                    color:
                      showRecycleBin || deletedTasks.length > 0
                        ? '#E11D48'
                        : theme.colors.textSecondary,
                  }}
                >
                  Papelera ({deletedTasks.length})
                </Text>
              </TouchableOpacity>

              {/* Selector Rápido de Tema Visual */}
              <ThemeSelectorPill />
            </View>
          </View>

          {/* Resumen de Estado del Tablero Kanban + Métrica de Estancamiento */}
          <View
            className="flex-row justify-between p-2.5 rounded-2xl border"
            style={{
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            }}
          >
            <View className="flex-1 items-center py-1">
              <Text className="text-xs font-medium" style={{ color: theme.colors.textMuted }}>
                Por Hacer
              </Text>
              <Text className="text-base font-bold" style={{ color: theme.colors.text }}>
                {countTodo}
              </Text>
            </View>
            <View className="w-[1px] my-1" style={{ backgroundColor: theme.colors.border }} />
            <View className="flex-1 items-center py-1">
              <Text className="text-xs text-amber-500 font-medium">En Progreso</Text>
              <Text className="text-base font-bold text-amber-500">{countInProgress}</Text>
            </View>
            <View className="w-[1px] my-1" style={{ backgroundColor: theme.colors.border }} />
            <View className="flex-1 items-center py-1">
              <Text className="text-xs font-medium" style={{ color: theme.colors.success }}>
                Completadas
              </Text>
              <Text className="text-base font-bold" style={{ color: theme.colors.success }}>
                {countDone}
              </Text>
            </View>
            <View className="w-[1px] my-1" style={{ backgroundColor: theme.colors.border }} />
            <View className="flex-1 items-center py-1">
              <Text className="text-xs text-rose-500 font-medium">Estancadas</Text>
              <Text
                className="text-base font-bold"
                style={{
                  color: staleCount > 0 ? '#E11D48' : theme.colors.textMuted,
                }}
              >
                {staleCount}
              </Text>
            </View>
          </View>

          {staleCount > 0 && (
            <View className="mt-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 flex-row items-center">
              <AlertTriangle size={14} color="#D97706" />
              <Text className="text-[11px] font-semibold text-amber-600 ml-2 flex-1">
                {staleCount} tarea{staleCount === 1 ? '' : 's'} en &quot;En Progreso&quot; lleva
                {staleCount === 1 ? '' : 'n'} más de 7 días sin actualizarse.
              </Text>
            </View>
          )}

          {/* Telemetría encapsulada exclusivamente para modo desarrollo (__DEV__) o menú oculto */}
          <DebugTelemetry
            visibleBySecretMenu={secretDevMenuUnlocked}
            folderDepth={folder?.depth}
            totalNestedTasks={folder?.task_count}
          />
        </View>

        {/* Módulo Expandible: Papelera de Reciclaje (Soft Deletes) */}
        {showRecycleBin && (
          <View
            style={[
              theme.cardStyle,
              { borderColor: 'rgba(225, 29, 72, 0.3)', padding: 16, marginBottom: 16 },
            ]}
          >
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="flex-row items-center">
                <Trash2 size={15} color="#E11D48" />
                <Text
                  className="text-sm font-bold ml-1.5"
                  style={{ color: theme.colors.text }}
                >
                  Papelera de Reciclaje ({deletedTasks.length})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowRecycleBin(false)}>
                <X size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            {deletedTasks.length === 0 ? (
              <Text
                className="text-xs py-3 text-center"
                style={{ color: theme.colors.textMuted }}
              >
                La papelera de esta carpeta está vacía.
              </Text>
            ) : (
              deletedTasks.map((dt) => (
                <View
                  key={dt.id}
                  className="flex-row items-center justify-between p-3 rounded-2xl mb-2 border"
                  style={{
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  }}
                >
                  <View className="flex-1 mr-2">
                    <Text
                      className="text-xs font-bold line-through"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {dt.title}
                    </Text>
                    <Text
                      className="text-[10px] mt-0.5"
                      style={{ color: theme.colors.textMuted }}
                    >
                      Estado previo: {dt.status} • Prioridad: {dt.priority}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => restoreTaskOptimistic(dt.id)}
                      className="flex-row items-center px-2.5 py-1.5 rounded-xl mr-1.5"
                      style={{ backgroundColor: theme.colors.success }}
                    >
                      <RotateCcw size={12} color="#FFFFFF" />
                      <Text className="text-[11px] font-bold text-white ml-1">Restaurar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => hardDeleteTaskOptimistic(dt.id)}
                      className="p-1.5 rounded-xl"
                      style={{ backgroundColor: 'rgba(225, 29, 72, 0.15)' }}
                    >
                      <Trash2 size={13} color="#E11D48" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Sección Expandible: Bloque de Contexto / Idea del Proyecto con Markdown y Edición In-Situ */}
        <ProjectContextSection
          key={`context-${folderId}`}
          folderId={folderId}
          initialDescription={folder?.description}
          onDescriptionSaved={(newDesc) => {
            setFolder((prev) => (prev ? { ...prev, description: newDesc } : prev));
          }}
        />

        {/* Bloque de Historial de Actividad Acotado (SectionList + Fechas Relativas) */}
        <ProjectHistorySection key={`history-${folderId}`} folderId={folderId} />

        {/* Sección: Subcarpetas (con Herencia Visual del Color Padre) */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Layers size={16} color={theme.colors.textMuted} />
              <Text
                className="text-sm font-bold ml-1.5"
                style={{ color: theme.colors.text }}
              >
                Subcarpetas ({subfolders.length})
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsFolderModalOpen(true)}
              className="flex-row items-center px-2.5 py-1 rounded-lg border"
              style={{
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              }}
            >
              <FolderPlus size={13} color={theme.colors.accent} />
              <Text
                className="text-xs font-semibold ml-1"
                style={{ color: theme.colors.accent }}
              >
                Nueva Subcarpeta
              </Text>
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

        {/* Sección: Tareas (Tablero Kanban Optimizado + Módulo de Filtrado Multicriterio) */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-2.5">
            <View className="flex-row items-center">
              <ListTodo size={16} color={theme.colors.textMuted} />
              <Text
                className="text-sm font-bold ml-1.5"
                style={{ color: theme.colors.text }}
              >
                Tablero Kanban ({criteriaFilteredTasks.length}/{tasks.length})
              </Text>
            </View>

            <View className="flex-row items-center">
              {/* Botón de Filtros Multicriterio en Memoria */}
              <TouchableOpacity
                onPress={() => setShowFiltersPanel((prev) => !prev)}
                className="flex-row items-center px-2.5 py-1.5 rounded-xl border mr-2"
                style={{
                  backgroundColor:
                    hasActiveFilters || showFiltersPanel
                      ? theme.colors.accent
                      : theme.colors.surfaceElevated,
                  borderColor:
                    hasActiveFilters || showFiltersPanel
                      ? theme.colors.accent
                      : theme.colors.border,
                }}
              >
                <Filter
                  size={13}
                  color={
                    hasActiveFilters || showFiltersPanel
                      ? theme.colors.accentText
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  className="text-xs font-semibold ml-1"
                  style={{
                    color:
                      hasActiveFilters || showFiltersPanel
                        ? theme.colors.accentText
                        : theme.colors.text,
                  }}
                >
                  Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </Text>
              </TouchableOpacity>

              <View
                className="flex-row p-0.5 rounded-xl mr-2 border"
                style={{
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                }}
              >
                <TouchableOpacity
                  onPress={() => setViewMode('KANBAN')}
                  className="p-1.5 rounded-lg"
                  style={{
                    backgroundColor: viewMode === 'KANBAN' ? theme.colors.surface : 'transparent',
                  }}
                >
                  <KanbanIcon
                    size={15}
                    color={viewMode === 'KANBAN' ? theme.colors.text : theme.colors.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setViewMode('LIST')}
                  className="p-1.5 rounded-lg"
                  style={{
                    backgroundColor: viewMode === 'LIST' ? theme.colors.surface : 'transparent',
                  }}
                >
                  <LayoutList
                    size={15}
                    color={viewMode === 'LIST' ? theme.colors.text : theme.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => openCreateTaskForStatus('TODO')}
                className="flex-row items-center px-3 py-1.5 rounded-xl"
                style={{ backgroundColor: theme.colors.accent }}
              >
                <Plus size={14} color={theme.colors.accentText} />
                <Text
                  className="text-xs font-semibold ml-1"
                  style={{ color: theme.colors.accentText }}
                >
                  Nueva
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Panel de Filtrado Multicriterio Apilable en Memoria (Zustand) */}
          {(showFiltersPanel || hasActiveFilters) && (
            <View style={[theme.cardStyle, { padding: 14, marginBottom: 12 }]}>
              <View className="flex-row items-center justify-between mb-2">
                <Text
                  className="text-xs font-bold"
                  style={{ color: theme.colors.text }}
                >
                  Filtrado Multicriterio en Memoria (Prioridad + Fecha Límite)
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity
                    onPress={clearFilters}
                    className="px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: theme.colors.surfaceElevated }}
                  >
                    <Text
                      className="text-[10px] font-bold"
                      style={{ color: theme.colors.accent }}
                    >
                      Limpiar filtros
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Filtros apilables por Prioridad */}
              <Text
                className="text-[11px] font-semibold mb-1.5"
                style={{ color: theme.colors.textMuted }}
              >
                Prioridad (apilable):
              </Text>
              <View className="flex-row flex-wrap mb-2.5">
                {PRIORITY_FILTERS.map((pf) => {
                  const isSelected = selectedPriorities.includes(pf.id);
                  return (
                    <TouchableOpacity
                      key={pf.id}
                      onPress={() => togglePriorityFilter(pf.id)}
                      className="px-3 py-1 rounded-xl border mr-2 mb-1"
                      style={{
                        backgroundColor: isSelected
                          ? pf.id === 'HIGH'
                            ? '#E11D48'
                            : pf.id === 'MEDIUM'
                            ? '#D97706'
                            : '#2563EB'
                          : theme.colors.surfaceElevated,
                        borderColor: isSelected
                          ? pf.id === 'HIGH'
                            ? '#E11D48'
                            : pf.id === 'MEDIUM'
                            ? '#D97706'
                            : '#2563EB'
                          : theme.colors.border,
                      }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{
                          color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                        }}
                      >
                        {pf.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Filtro por Fecha Límite */}
              <View className="flex-row items-center mb-1.5">
                <Calendar size={11} color={theme.colors.textMuted} />
                <Text
                  className="text-[11px] font-semibold ml-1"
                  style={{ color: theme.colors.textMuted }}
                >
                  Fecha límite:
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {DUE_DATE_FILTERS.map((df) => {
                  const isSelected = dueDateFilter === df.id;
                  return (
                    <TouchableOpacity
                      key={df.id}
                      onPress={() => setDueDateFilter(df.id)}
                      className="px-2.5 py-1 rounded-xl border mr-1.5"
                      style={{
                        backgroundColor: isSelected
                          ? theme.colors.accent
                          : theme.colors.surfaceElevated,
                        borderColor: isSelected
                          ? theme.colors.accent
                          : theme.colors.border,
                      }}
                    >
                      <Text
                        className="text-[11px] font-semibold"
                        style={{
                          color: isSelected
                            ? theme.colors.accentText
                            : theme.colors.textSecondary,
                        }}
                      >
                        {df.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {viewMode === 'KANBAN' ? (
            <KanbanBoardView
              tasks={criteriaFilteredTasks}
              onMoveStatus={handleStatusChange}
              onDeleteTask={handleDeleteTask}
              onOpenCreateTask={openCreateTaskForStatus}
            />
          ) : (
            <View>
              <View
                className="flex-row p-1 rounded-xl mb-3 border"
                style={{
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                }}
              >
                {[
                  { id: 'ALL', label: 'Todas' },
                  { id: 'TODO', label: 'Por Hacer' },
                  { id: 'IN_PROGRESS', label: 'En Progreso' },
                  { id: 'DONE', label: 'Completado' },
                ].map((tab) => (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id as FilterTab)}
                    className="flex-1 py-1.5 rounded-lg items-center"
                    style={{
                      backgroundColor:
                        activeTab === tab.id ? theme.colors.surface : 'transparent',
                    }}
                  >
                    <Text
                      className="text-[11px] font-bold"
                      style={{
                        color:
                          activeTab === tab.id
                            ? theme.colors.text
                            : theme.colors.textMuted,
                      }}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {listFilteredTasks.length === 0 ? (
                <View
                  style={[
                    theme.cardStyle,
                    { padding: 32, alignItems: 'center', justifyContent: 'center' },
                  ]}
                >
                  <CheckCircle2 size={32} color={theme.colors.textMuted} />
                  <Text
                    className="text-sm font-semibold mt-2"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    No hay tareas que coincidan con los filtros
                  </Text>
                </View>
              ) : (
                listFilteredTasks.map((task) => (
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

      {/* Modal de creación de subcarpeta con Herencia Visual del color del nodo padre */}
      <CreateFolderModal
        visible={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSubmit={handleCreateSubfolder}
        defaultColor={folder?.color || '#3B82F6'}
        parentFolderName={folder?.name}
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
