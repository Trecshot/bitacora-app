import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  CheckCircle2,
  Circle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Trash2,
  GripVertical,
  Calendar,
  AlertTriangle,
} from 'lucide-react-native';
import { Task, TaskStatus } from '../db/database';

interface OptimizedKanbanCardProps {
  task: Task;
  onMoveStatus: (id: number, nextStatus: TaskStatus) => void;
  onDelete?: (id: number) => void;
  /** Callback para Edge Scrolling cuando el puntero se desplaza horizontalmente */
  onDragMoveX?: (absoluteX: number) => void;
  /** Callback al finalizar el arrastre para detener el Edge Scrolling */
  onDragEnd?: () => void;
}

const DRAG_THRESHOLD = 85;

function checkIsStale(task: Task): boolean {
  if (task.status !== 'IN_PROGRESS' || !task.updated_at) return false;
  const updatedMs = new Date(task.updated_at.replace(' ', 'T')).getTime();
  if (Number.isNaN(updatedMs)) return false;
  return updatedMs < Date.now() - 7 * 86400000;
}

export const OptimizedKanbanCard: React.FC<OptimizedKanbanCardProps> = ({
  task,
  onMoveStatus,
  onDelete,
  onDragMoveX,
  onDragEnd,
}) => {
  // Coordenadas físicas (X, Y) y valores de animación en el UI thread
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);
  const isDragging = useSharedValue(false);

  const isStale = checkIsStale(task);

  // Estados adyacentes en el flujo Kanban
  const getNextStatus = (): TaskStatus | null => {
    if (task.status === 'TODO') return 'IN_PROGRESS';
    if (task.status === 'IN_PROGRESS') return 'DONE';
    return null;
  };

  const getPrevStatus = (): TaskStatus | null => {
    if (task.status === 'DONE') return 'IN_PROGRESS';
    if (task.status === 'IN_PROGRESS') return 'TODO';
    return null;
  };

  const nextStatus = getNextStatus();
  const prevStatus = getPrevStatus();

  const triggerHapticFeedback = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  };

  const handleCommitStatus = (status: TaskStatus) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    onMoveStatus(task.id, status);
  };

  const notifyDragMoveX = (absX: number) => {
    if (onDragMoveX) {
      onDragMoveX(absX);
    }
  };

  const notifyDragEnd = () => {
    if (onDragEnd) {
      onDragEnd();
    }
  };

  /**
   * Motor de Gestos (react-native-gesture-handler)
   * Ejecutado en el UI thread mediante Worklets de Reanimated y reportando
   * coordenada absoluta (event.absoluteX) para Edge Scrolling en el 10% del margen.
   */
  const panGesture = Gesture.Pan()
    .activateAfterLongPress(150)
    .onStart((event) => {
      'worklet';
      scale.value = withSpring(1.05, { damping: 14, stiffness: 220 });
      zIndex.value = 100;
      isDragging.value = true;
      runOnJS(triggerHapticFeedback)();
      runOnJS(notifyDragMoveX)(event.absoluteX);
    })
    .onUpdate((event) => {
      'worklet';
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.35;
      runOnJS(notifyDragMoveX)(event.absoluteX);
    })
    .onEnd((event) => {
      'worklet';
      if (event.translationX > DRAG_THRESHOLD && nextStatus) {
        runOnJS(handleCommitStatus)(nextStatus);
      } else if (event.translationX < -DRAG_THRESHOLD && prevStatus) {
        runOnJS(handleCommitStatus)(prevStatus);
      }
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 18, stiffness: 220 });
      translateX.value = withSpring(0, { damping: 20, stiffness: 240 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 240 });
      zIndex.value = 1;
      isDragging.value = false;
      runOnJS(notifyDragEnd)();
    });

  // Estilos animados en el UI Thread (sin uso de CPU de JS)
  const animatedCardStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      zIndex: zIndex.value,
    };
  });

  const animatedRightDropStyle = useAnimatedStyle(() => {
    'worklet';
    const opacity = interpolate(
      translateX.value,
      [20, DRAG_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const animatedLeftDropStyle = useAnimatedStyle(() => {
    'worklet';
    const opacity = interpolate(
      translateX.value,
      [-DRAG_THRESHOLD, -20],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const getStatusBadge = () => {
    switch (task.status) {
      case 'DONE':
        return {
          label: 'Completado',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle2 size={14} color="#10B981" />,
        };
      case 'IN_PROGRESS':
        return {
          label: 'En Progreso',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Clock size={14} color="#F59E0B" />,
        };
      default:
        return {
          label: 'Por Hacer',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <Circle size={14} color="#64748B" />,
        };
    }
  };

  const getPriorityBadge = () => {
    switch (task.priority) {
      case 'HIGH':
        return { label: 'Alta', color: 'text-rose-600 bg-rose-50 border-rose-200' };
      case 'MEDIUM':
        return { label: 'Media', color: 'text-amber-600 bg-amber-50 border-amber-200' };
      default:
        return { label: 'Baja', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    }
  };

  const statusBadge = getStatusBadge();
  const priorityBadge = getPriorityBadge();

  return (
    <View className="mb-2.5 relative rounded-2xl overflow-hidden">
      {/* Zona visual de Drop hacia la izquierda (Retroceso Kanban) */}
      <Animated.View
        style={[animatedLeftDropStyle]}
        className="absolute inset-0 bg-amber-500 rounded-2xl flex-row items-center px-4 justify-start"
      >
        <ArrowLeft size={18} color="#FFFFFF" />
        <Text className="text-white font-bold text-xs ml-2">
          {prevStatus === 'TODO' ? 'Por Hacer' : 'En Progreso'}
        </Text>
      </Animated.View>

      {/* Zona visual de Drop hacia la derecha (Avance Kanban) */}
      <Animated.View
        style={[animatedRightDropStyle]}
        className="absolute inset-0 bg-emerald-600 rounded-2xl flex-row items-center px-4 justify-end"
      >
        <Text className="text-white font-bold text-xs mr-2">
          {nextStatus === 'IN_PROGRESS' ? 'En Progreso' : 'Completado'}
        </Text>
        <ArrowRight size={18} color="#FFFFFF" />
      </Animated.View>

      {/* Tarjeta de Tarea compacta con feedback háptico y Reanimated scale(1.05) */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[animatedCardStyle, styles.cardShadow]}
          className={`bg-white p-3.5 rounded-2xl border ${
            isStale ? 'border-amber-300' : 'border-slate-200/90'
          }`}
        >
          {/* Fila Superior: Badges y Acciones */}
          <View className="flex-row items-center justify-between mb-1.5">
            <View className="flex-row items-center flex-wrap">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  const cycle: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
                  const currentIndex = cycle.indexOf(task.status);
                  const next = cycle[(currentIndex + 1) % cycle.length];
                  handleCommitStatus(next);
                }}
                className={`flex-row items-center px-2 py-0.5 rounded-full border ${statusBadge.bg}`}
              >
                {statusBadge.icon}
                <Text className="text-[11px] font-semibold ml-1">{statusBadge.label}</Text>
              </TouchableOpacity>

              <View className={`px-2 py-0.5 rounded-md border ml-1.5 ${priorityBadge.color}`}>
                <Text className="text-[10px] font-bold uppercase">{priorityBadge.label}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              {onDelete && (
                <TouchableOpacity
                  onPress={() => onDelete(task.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className="p-1 mr-1"
                >
                  <Trash2 size={14} color="#94A3B8" />
                </TouchableOpacity>
              )}
              <GripVertical size={15} color="#CBD5E1" />
            </View>
          </View>

          {/* Título de la tarea */}
          <Text
            className={`text-sm font-semibold text-slate-800 ${
              task.status === 'DONE' ? 'line-through text-slate-400' : ''
            }`}
          >
            {task.title}
          </Text>

          {/* Descripción opcional */}
          {Boolean(task.description) && (
            <Text className="text-xs text-slate-500 mt-1 leading-relaxed" numberOfLines={2}>
              {task.description}
            </Text>
          )}

          {/* Metadatos inferiores: Fecha límite y alerta de estancamiento */}
          {(Boolean(task.due_date) || isStale) && (
            <View className="flex-row items-center justify-between mt-2 pt-1.5 border-t border-slate-100 flex-wrap">
              {Boolean(task.due_date) && (
                <View className="flex-row items-center mr-2">
                  <Calendar size={11} color="#64748B" />
                  <Text className="text-[10px] text-slate-500 font-medium ml-1">
                    Vence: {task.due_date?.substring(0, 10)}
                  </Text>
                </View>
              )}
              {isStale && (
                <View className="flex-row items-center bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  <AlertTriangle size={10} color="#D97706" />
                  <Text className="text-[10px] font-bold text-amber-700 ml-1">
                    Estancada (&gt;7d)
                  </Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});
