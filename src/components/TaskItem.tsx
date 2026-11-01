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

interface TaskItemProps {
  task: Task;
  onStatusChange: (id: number, nextStatus: TaskStatus) => void;
  onDelete?: (id: number) => void;
}

const SWIPE_THRESHOLD = 80;

export const TaskItem: React.FC<TaskItemProps> = ({ task, onStatusChange, onDelete }) => {
  const translateX = useSharedValue(0);

  // Determinar siguiente estado en el Kanban
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
          style={[
            animatedCardStyle,
            {
              shadowColor: '#64748B',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 2,
            },
          ]}
          className="bg-white p-4 rounded-2xl border border-slate-100"
        >
          {/* Fila Superior: Badges de Estado y Prioridad */}
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center space-x-2">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  const cycle: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
                  const currentIndex = cycle.indexOf(task.status);
                  const next = cycle[(currentIndex + 1) % cycle.length];
                  onStatusChange(task.id, next);
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

            {onDelete && (
              <TouchableOpacity
                onPress={() => onDelete(task.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="p-1 rounded-md"
              >
                <Trash2 size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Título y Descripción */}
          <Text
            className={`text-base font-semibold text-slate-800 ${
              task.status === 'DONE' ? 'line-through text-slate-400' : ''
            }`}
          >
            {task.title}
          </Text>

          {Boolean(task.description) && (
            <Text
              className="text-xs text-slate-500 mt-1"
              numberOfLines={2}
            >
              {task.description}
            </Text>
          )}

          {/* Indicador de ayuda para el gesto swipe */}
          <View className="mt-2.5 pt-2 border-t border-slate-100 flex-row items-center justify-between">
            <Text className="text-[10px] text-slate-400 italic">
              ← Desliza para cambiar estado en el Kanban →
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
