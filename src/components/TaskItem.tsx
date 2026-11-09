import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { CheckCircle2, Circle, Clock, ArrowRight, ArrowLeft, Trash2 } from 'lucide-react-native';
import { Task, TaskStatus } from '../db/database';
import {
  getNextTaskStatus,
  getPrevTaskStatus,
  cycleTaskStatus,
} from '../utils/dateAndTaskUtils';
import { useTheme } from '../theme/ThemeContext';

interface TaskItemProps {
  task: Task;
  onStatusChange: (id: number, nextStatus: TaskStatus) => void;
  onDelete?: (id: number) => void;
}

const SWIPE_THRESHOLD = 80;

export const TaskItem: React.FC<TaskItemProps> = ({ task, onStatusChange, onDelete }) => {
  const { theme } = useTheme();
  const translateX = useSharedValue(0);

  const nextStatus = getNextTaskStatus(task.status);
  const prevStatus = getPrevTaskStatus(task.status);

  const handleStatusChangeJS = (status: TaskStatus) => {
    onStatusChange(task.id, status);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      // Limitar deslizamiento según los estados posibles
      if (event.translationX < 0 && !nextStatus) {
        translateX.value = event.translationX * 0.2; // resistencia si ya está en DONE
      } else if (event.translationX > 0 && !prevStatus) {
        translateX.value = event.translationX * 0.2; // resistencia si ya está en TODO
      } else {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD && nextStatus) {
        runOnJS(handleStatusChangeJS)(nextStatus);
      } else if (event.translationX > SWIPE_THRESHOLD && prevStatus) {
        runOnJS(handleStatusChangeJS)(prevStatus);
      }
      translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const animatedLeftBgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [15, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const animatedRightBgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -15],
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
          dot: 'bg-emerald-500',
          icon: <CheckCircle2 size={16} color="#10B981" />,
        };
      case 'IN_PROGRESS':
        return {
          label: 'En Progreso',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          icon: <Clock size={16} color="#F59E0B" />,
        };
      default:
        return {
          label: 'Por Hacer',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          icon: <Circle size={16} color="#64748B" />,
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
      {/* Fondo de acción al deslizar a la derecha (Retroceder estado) */}
      <Animated.View
        style={[animatedLeftBgStyle]}
        className="absolute inset-0 bg-amber-500 rounded-2xl flex-row items-center px-5 justify-start"
      >
        <ArrowLeft size={20} color="#FFFFFF" />
        <Text className="text-white font-semibold text-xs ml-2">
          {prevStatus === 'TODO' ? 'Regresar a Por Hacer' : 'Regresar a En Progreso'}
        </Text>
      </Animated.View>

      {/* Fondo de acción al deslizar a la izquierda (Avanzar estado) */}
      <Animated.View
        style={[animatedRightBgStyle]}
        className="absolute inset-0 bg-emerald-600 rounded-2xl flex-row items-center px-5 justify-end"
      >
        <Text className="text-white font-semibold text-xs mr-2">
          {nextStatus === 'IN_PROGRESS' ? 'Mover a En Progreso' : 'Mover a Completado'}
        </Text>
        <ArrowRight size={20} color="#FFFFFF" />
      </Animated.View>

      {/* Tarjeta de Tarea Interactiva con Gesture Handler y Reanimated */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[animatedCardStyle, theme.cardStyle, { padding: 14 }]}
        >
          {/* Fila Superior: Badges de Estado y Prioridad */}
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center space-x-2">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onStatusChange(task.id, cycleTaskStatus(task.status))}
                className={`flex-row items-center px-2.5 py-1 rounded-full border ${statusBadge.bg}`}
              >
                {statusBadge.icon}
                <Text className="text-xs font-semibold ml-1.5">{statusBadge.label}</Text>
              </TouchableOpacity>

              <View className={`px-2 py-0.5 rounded-md border ${priorityBadge.color}`}>
                <Text className="text-[10px] font-bold uppercase">{priorityBadge.label}</Text>
              </View>
            </View>

            {onDelete && (
              <TouchableOpacity
                onPress={() => onDelete(task.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="p-1 rounded-md"
              >
                <Trash2 size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Título y Descripción */}
          <Text
            className="text-base font-semibold"
            style={{
              color: task.status === 'DONE' ? theme.colors.textMuted : theme.colors.text,
              textDecorationLine: task.status === 'DONE' ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </Text>

          {Boolean(task.description) && (
            <Text
              className="text-xs mt-1"
              style={{ color: theme.colors.textSecondary }}
              numberOfLines={2}
            >
              {task.description}
            </Text>
          )}

          {/* Indicador de ayuda para el gesto swipe */}
          <View
            className="mt-2.5 pt-2 border-t flex-row items-center justify-between"
            style={{ borderColor: theme.colors.border }}
          >
            <Text className="text-[10px] italic" style={{ color: theme.colors.textMuted }}>
              ← Desliza para cambiar estado en el Kanban →
            </Text>
            {Boolean(task.created_at) && (
              <Text className="text-[10px]" style={{ color: theme.colors.textMuted }}>
                {task.created_at?.split(' ')[1] || ''}
              </Text>
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};
