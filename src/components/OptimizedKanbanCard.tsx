import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
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
} from 'lucide-react-native';
import { Task, TaskStatus } from '../db/database';

interface OptimizedKanbanCardProps {
  task: Task;
  onMoveStatus: (id: number, nextStatus: TaskStatus) => void;
  onDelete?: (id: number) => void;
}

const DRAG_THRESHOLD = 85;

export const OptimizedKanbanCard: React.FC<OptimizedKanbanCardProps> = ({
  task,
  onMoveStatus,
  onDelete,
}) => {
  // Coordenadas físicas (X, Y) y valores de animación en el UI thread
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);
  const isDragging = useSharedValue(false);

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

  const handleCommitStatus = (status: TaskStatus) => {
    onMoveStatus(task.id, status);
  };

  /**
   * Motor de Gestos (react-native-gesture-handler)
   * Captura continua de coordenadas (X, Y) ejecutada exclusivamente
   * en el UI thread mediante worklets sin cruzar el bridge de React Native.
   */
  const panGesture = Gesture.Pan()
    .activateAfterLongPress(100)
    .onBegin(() => {
      'worklet';
      // Animador UI: Escala y elevación inmediata al sostener la tarjeta
      scale.value = withSpring(1.04, { damping: 14, stiffness: 220 });
      zIndex.value = 100;
      isDragging.value = true;
    })
    .onUpdate((event) => {
      'worklet';
      // Captura de coordenadas físicas (X, Y) continuas a 60 FPS en hilo nativo
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.4; // amortiguación vertical para no salirse de la fila
    })
    .onEnd((event) => {
      'worklet';
      // Detección de soltar (drop) sobre zona Kanban
      if (event.translationX > DRAG_THRESHOLD && nextStatus) {
        runOnJS(handleCommitStatus)(nextStatus);
      } else if (event.translationX < -DRAG_THRESHOLD && prevStatus) {
        runOnJS(handleCommitStatus)(prevStatus);
      }

      // Animación de retorno (drop) sin latencia
      scale.value = withSpring(1, { damping: 18, stiffness: 220 });
      translateX.value = withSpring(0, { damping: 20, stiffness: 240 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 240 });
      zIndex.value = 1;
      isDragging.value = false;
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
          icon: <CheckCircle2 size={15} color="#10B981" />,
        };
      case 'IN_PROGRESS':
        return {
          label: 'En Progreso',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Clock size={15} color="#F59E0B" />,
        };
      default:
        return {
          label: 'Por Hacer',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <Circle size={15} color="#64748B" />,
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
    <View className="mb-3 relative rounded-2xl overflow-hidden">
      {/* Zona visual de Drop hacia la izquierda (Retroceso Kanban) */}
      <Animated.View
        style={[animatedLeftDropStyle]}
        className="absolute inset-0 bg-amber-500 rounded-2xl flex-row items-center px-4 justify-start"
      >
        <ArrowLeft size={18} color="#FFFFFF" />
        <Text className="text-white font-bold text-xs ml-2">
          {prevStatus === 'TODO' ? 'Soltar en "Por Hacer"' : 'Soltar en "En Progreso"'}
        </Text>
      </Animated.View>

      {/* Zona visual de Drop hacia la derecha (Avance Kanban) */}
      <Animated.View
        style={[animatedRightDropStyle]}
        className="absolute inset-0 bg-emerald-600 rounded-2xl flex-row items-center px-4 justify-end"
      >
        <Text className="text-white font-bold text-xs mr-2">
          {nextStatus === 'IN_PROGRESS' ? 'Soltar en "En Progreso"' : 'Soltar en "Completado"'}
        </Text>
        <ArrowRight size={18} color="#FFFFFF" />
      </Animated.View>

      {/* Tarjeta de Tarea optimizada con Gestos continuos y Reanimated */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            animatedCardStyle,
            styles.cardShadow,
          ]}
          className="bg-white p-4 rounded-2xl border border-slate-200/90"
        >
          {/* Fila Superior: Badges y Manilla de Arrastre */}
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center space-x-2">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  const cycle: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
                  const currentIndex = cycle.indexOf(task.status);
                  const next = cycle[(currentIndex + 1) % cycle.length];
                  onMoveStatus(task.id, next);
                }}
                className={`flex-row items-center px-2.5 py-1 rounded-full border ${statusBadge.bg}`}
              >
                {statusBadge.icon}
                <Text className="text-xs font-semibold ml-1.5">{statusBadge.label}</Text>
              </TouchableOpacity>

              <View className={`px-2 py-0.5 rounded-md border ${priorityBadge.color}`}>
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
                  <Trash2 size={15} color="#94A3B8" />
                </TouchableOpacity>
              )}
              {/* Indicador de agarre táctil */}
              <GripVertical size={16} color="#CBD5E1" />
            </View>
          </View>

          {/* Título de la tarea */}
          <Text
            className={`text-base font-semibold text-slate-800 ${
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

          {/* Pie de Tarjeta: Orientación táctil */}
          <View className="mt-2.5 pt-2 border-t border-slate-100 flex-row items-center justify-between">
            <Text className="text-[10px] text-slate-400 font-medium">
              Mantén y arrastra (Hold & Drag) para mover en Kanban
            </Text>
            {Boolean(task.created_at) && (
              <Text className="text-[10px] text-slate-400">
                {task.created_at?.split(' ')[1] || ''}
              </Text>
            )}
          </View>
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
