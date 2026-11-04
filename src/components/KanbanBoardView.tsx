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

interface KanbanBoardViewProps {
  tasks: Task[];
  onMoveStatus: (id: number, nextStatus: TaskStatus) => void;
  onDeleteTask: (id: number) => void;
  onOpenCreateTask: (initialStatus: TaskStatus) => void;
}

const EDGE_THRESHOLD_RATIO = 0.1; // 10% del margen horizontal de la pantalla
const AUTO_SCROLL_STEP_PX = 180;
const AUTO_SCROLL_INTERVAL_MS = 220;

const COLUMNS: {
  id: TaskStatus;
  title: string;
  badgeBg: string;
  badgeText: string;
  headerBorder: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'TODO',
    title: 'Por Hacer',
    badgeBg: 'bg-slate-200',
    badgeText: 'text-slate-700',
    headerBorder: 'border-slate-300',
    icon: <Circle size={15} color="#64748B" />,
  },
  {
    id: 'IN_PROGRESS',
    title: 'En Progreso',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    headerBorder: 'border-amber-400',
    icon: <Clock size={15} color="#D97706" />,
  },
  {
    id: 'DONE',
    title: 'Completado',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    headerBorder: 'border-emerald-400',
    icon: <CheckCircle2 size={15} color="#059669" />,
  },
];

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({
  tasks,
  onMoveStatus,
  onDeleteTask,
  onOpenCreateTask,
}) => {
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

  return (
    <View className="relative" onLayout={handleLayout}>
      {/* Indicadores visuales de Edge Scrolling en el 10% de los márgenes */}
      {isDraggingCard && activeEdgeZone === 'LEFT' && (
        <View
          pointerEvents="none"
          className="absolute left-0 top-0 bottom-6 w-9 z-50 bg-blue-600/20 rounded-r-2xl items-center justify-center border-r border-blue-400/50"
        >
          <ChevronsLeft size={20} color="#2563EB" />
        </View>
      )}
      {isDraggingCard && activeEdgeZone === 'RIGHT' && (
        <View
          pointerEvents="none"
          className="absolute right-0 top-0 bottom-6 w-9 z-50 bg-blue-600/20 rounded-l-2xl items-center justify-center border-l border-blue-400/50"
        >
          <ChevronsRight size={20} color="#2563EB" />
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
        className="flex-1"
      >
        {COLUMNS.map((col) => {
          const columnTasks = groupedTasks[col.id];

          return (
            <View
              key={col.id}
              className="w-[285px] mr-3 bg-slate-100/90 rounded-3xl p-3 border border-slate-200/80 flex-col"
              style={{ minHeight: 420, maxHeight: 560 }}
            >
              {/* Cabecera de la Columna Kanban */}
              <View
                className={`flex-row items-center justify-between pb-2.5 mb-2.5 border-b-2 ${col.headerBorder}`}
              >
                <View className="flex-row items-center">
                  {col.icon}
                  <Text className="text-sm font-bold text-slate-800 ml-1.5">{col.title}</Text>
                  <View className={`ml-2 px-2 py-0.5 rounded-full ${col.badgeBg}`}>
                    <Text className={`text-xs font-bold ${col.badgeText}`}>
                      {columnTasks.length}
                    </Text>
                  </View>
                </View>

                {/* Botón rápido para agregar tarea en esta columna */}
                <TouchableOpacity
                  onPress={() => onOpenCreateTask(col.id)}
                  className="w-7 h-7 rounded-xl bg-white items-center justify-center border border-slate-200 shadow-sm"
                >
                  <Plus size={14} color="#334155" />
                </TouchableOpacity>
              </View>

              {/* Virtualización de Columna Kanban mediante Shopify FlashList */}
              <View className="flex-1" style={{ minHeight: 340 }}>
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
                      className={`py-12 items-center justify-center border-2 border-dashed rounded-2xl px-3 mt-2 ${
                        isDraggingCard
                          ? 'border-blue-400 bg-blue-50/70'
                          : 'border-slate-200 bg-white/50'
                      }`}
                    >
                      <MoveHorizontal
                        size={18}
                        color={isDraggingCard ? '#2563EB' : '#94A3B8'}
                      />
                      <Text
                        className={`text-xs font-semibold text-center mt-1.5 ${
                          isDraggingCard ? 'text-blue-700' : 'text-slate-400'
                        }`}
                      >
                        {isDraggingCard ? 'Suelta aquí para mover' : 'Sin tareas'}
                      </Text>
                      <Text className="text-[11px] text-slate-400 text-center mt-1">
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
