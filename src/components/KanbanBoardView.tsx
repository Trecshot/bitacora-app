import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import {
  Circle,
  Clock,
  CheckCircle2,
  Plus,
  ChevronsLeft,
  ChevronsRight,
  MoveHorizontal,
} from 'lucide-react-native';
import { Task, TaskStatus } from '../db/database';
import { OptimizedKanbanCard } from './OptimizedKanbanCard';
import { useTheme } from '../theme/ThemeContext';

interface KanbanBoardViewProps {
  tasks: Task[];
  onMoveStatus: (id: number, nextStatus: TaskStatus) => void;
  onDeleteTask: (id: number) => void;
  onOpenCreateTask: (initialStatus: TaskStatus) => void;
}

const EDGE_THRESHOLD_RATIO = 0.1; // 10% del margen horizontal de la pantalla
const AUTO_SCROLL_STEP_PX = 180;
const AUTO_SCROLL_INTERVAL_MS = 220;

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({
  tasks,
  onMoveStatus,
  onDeleteTask,
  onOpenCreateTask,
}) => {
  const { theme } = useTheme();
  const scrollViewRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const currentScrollXRef = useRef(0);
  const contentWidthRef = useRef(0);
  const layoutMetricsRef = useRef({
    x: 0,
    width: Dimensions.get('window').width,
  });
  const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeEdgeDirectionRef = useRef<'LEFT' | 'RIGHT' | null>(null);

  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [activeEdgeZone, setActiveEdgeZone] = useState<'LEFT' | 'RIGHT' | null>(null);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
    activeEdgeDirectionRef.current = null;
    setActiveEdgeZone(null);
  }, []);

  useEffect(() => {
    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
  }, []);

  const performAutoScrollStep = useCallback((direction: 'LEFT' | 'RIGHT') => {
    const viewportWidth = layoutMetricsRef.current.width || Dimensions.get('window').width;
    const maxScrollX = Math.max(0, contentWidthRef.current - viewportWidth);
    const delta = direction === 'RIGHT' ? AUTO_SCROLL_STEP_PX : -AUTO_SCROLL_STEP_PX;
    const nextX = Math.max(0, Math.min(maxScrollX, currentScrollXRef.current + delta));

    if (nextX !== currentScrollXRef.current) {
      currentScrollXRef.current = nextX;
      scrollViewRef.current?.scrollTo({ x: nextX, animated: true });
    }
  }, []);

  /**
   * Calcula los límites (LayoutMetrics) durante el gesto de arrastre.
   * Si el puntero entra al 10% del margen horizontal izquierdo o derecho,
   * dispara un scrollTo automático.
   */
  const handleDragMoveX = useCallback(
    (absoluteX: number) => {
      setIsDraggingCard(true);
      const screenWidth = layoutMetricsRef.current.width || Dimensions.get('window').width;
      const leftEdgeLimit = layoutMetricsRef.current.x + screenWidth * EDGE_THRESHOLD_RATIO;
      const rightEdgeLimit =
        layoutMetricsRef.current.x + screenWidth * (1 - EDGE_THRESHOLD_RATIO);

      let nextDirection: 'LEFT' | 'RIGHT' | null = null;
      if (absoluteX <= leftEdgeLimit) {
        nextDirection = 'LEFT';
      } else if (absoluteX >= rightEdgeLimit) {
        nextDirection = 'RIGHT';
      }

      if (nextDirection !== activeEdgeDirectionRef.current) {
        if (autoScrollTimerRef.current) {
          clearInterval(autoScrollTimerRef.current);
          autoScrollTimerRef.current = null;
        }
        activeEdgeDirectionRef.current = nextDirection;
        setActiveEdgeZone(nextDirection);

        if (nextDirection) {
          performAutoScrollStep(nextDirection);
          autoScrollTimerRef.current = setInterval(() => {
            performAutoScrollStep(nextDirection!);
          }, AUTO_SCROLL_INTERVAL_MS);
        }
      }
    },
    [performAutoScrollStep]
  );

  const handleDragEnd = useCallback(() => {
    setIsDraggingCard(false);
    stopAutoScroll();
  }, [stopAutoScroll]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    layoutMetricsRef.current = {
      x,
      width: width || Dimensions.get('window').width,
    };
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    currentScrollXRef.current = e.nativeEvent.contentOffset.x;
  };

  // Agrupación memoizada por columna para evitar recalcular filtros en cada frame
  const groupedTasks = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };
    for (const task of tasks) {
      if (map[task.status]) {
        map[task.status].push(task);
      }
    }
    return map;
  }, [tasks]);

  const columnsDef = [
    {
      id: 'TODO' as TaskStatus,
      title: 'Por Hacer',
      accentColor: theme.colors.textMuted,
      icon: <Circle size={14} color={theme.colors.textMuted} />,
    },
    {
      id: 'IN_PROGRESS' as TaskStatus,
      title: 'En Progreso',
      accentColor: theme.colors.warning,
      icon: <Clock size={14} color={theme.colors.warning} />,
    },
    {
      id: 'DONE' as TaskStatus,
      title: 'Completado',
      accentColor: theme.colors.success,
      icon: <CheckCircle2 size={14} color={theme.colors.success} />,
    },
  ];

  return (
    <View style={{ position: 'relative' }} onLayout={handleLayout}>
      {/* Indicadores visuales de Edge Scrolling en el 10% de los márgenes */}
      {isDraggingCard && activeEdgeZone === 'LEFT' && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 24,
            width: 36,
            zIndex: 50,
            backgroundColor: `${theme.colors.accent}26`,
            borderTopRightRadius: 16,
            borderBottomRightRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            borderRightWidth: 1,
            borderRightColor: theme.colors.accent,
          }}
        >
          <ChevronsLeft size={20} color={theme.colors.accent} />
        </View>
      )}
      {isDraggingCard && activeEdgeZone === 'RIGHT' && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 24,
            width: 36,
            zIndex: 50,
            backgroundColor: `${theme.colors.accent}26`,
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            borderLeftWidth: 1,
            borderLeftColor: theme.colors.accent,
          }}
        >
          <ChevronsRight size={20} color={theme.colors.accent} />
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={(w) => {
          contentWidthRef.current = w;
        }}
        contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 24 }}
        style={{ flex: 1 }}
      >
        {columnsDef.map((col) => {
          const columnTasks = groupedTasks[col.id];

          return (
            <View
              key={col.id}
              style={{
                width: 285,
                marginRight: 12,
                backgroundColor: theme.colors.kanbanColumnBg,
                borderRadius: theme.metrics.radii.xl,
                padding: 12,
                borderColor: theme.colors.border,
                borderWidth: theme.metrics.borderWidth,
                flexDirection: 'column',
                minHeight: 420,
                maxHeight: 560,
              }}
            >
              {/* Cabecera de la Columna Kanban */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 10,
                  marginBottom: 10,
                  borderBottomWidth: 2,
                  borderBottomColor: col.accentColor,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {col.icon}
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: theme.typography.titleWeight,
                      color: theme.colors.text,
                      marginLeft: 6,
                    }}
                  >
                    {col.title}
                  </Text>
                  <View
                    style={{
                      marginLeft: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: theme.metrics.radii.full,
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.border,
                      borderWidth: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: theme.colors.textSecondary,
                      }}
                    >
                      {columnTasks.length}
                    </Text>
                  </View>
                </View>

                {/* Botón rápido para agregar tarea en esta columna */}
                <TouchableOpacity
                  onPress={() => onOpenCreateTask(col.id)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: theme.metrics.radii.md,
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={14} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Virtualización de Columna Kanban mediante Shopify FlashList */}
              <View style={{ flex: 1, minHeight: 340 }}>
                <FlashList
                  data={columnTasks}
                  keyExtractor={(item) => item.id.toString()}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  contentContainerStyle={{ paddingBottom: 16 }}
                  renderItem={({ item }) => (
                    <OptimizedKanbanCard
                      task={item}
                      onMoveStatus={onMoveStatus}
                      onDelete={onDeleteTask}
                      onDragMoveX={handleDragMoveX}
                      onDragEnd={handleDragEnd}
                    />
                  )}
                  ListEmptyComponent={
                    <View
                      style={{
                        paddingVertical: 40,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderStyle: 'dashed',
                        borderColor: isDraggingCard
                          ? theme.colors.accent
                          : theme.colors.border,
                        borderRadius: theme.metrics.radii.lg,
                        paddingHorizontal: 12,
                        marginTop: 8,
                        backgroundColor: isDraggingCard
                          ? theme.colors.accentSubtle
                          : 'transparent',
                      }}
                    >
                      <MoveHorizontal
                        size={18}
                        color={isDraggingCard ? theme.colors.accent : theme.colors.textMuted}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          textAlign: 'center',
                          marginTop: 6,
                          color: isDraggingCard ? theme.colors.accent : theme.colors.textMuted,
                        }}
                      >
                        {isDraggingCard ? 'Suelta aquí para mover' : 'Sin tareas'}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: theme.colors.textMuted,
                          textAlign: 'center',
                          marginTop: 4,
                        }}
                      >
                        {isDraggingCard
                          ? 'Acerca al borde (10%) para auto-desplazar el tablero'
                          : 'Presiona (+) para añadir o arrastra una tarjeta hacia los bordes.'}
                      </Text>
                    </View>
                  }
                />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};
