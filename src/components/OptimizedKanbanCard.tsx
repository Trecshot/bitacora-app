import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
import { Task, TaskPriority, TaskStatus } from '../db/database';
import {
  isTaskStale,
  getNextTaskStatus,
  getPrevTaskStatus,
  cycleTaskStatus,
} from '../utils/dateAndTaskUtils';
import { triggerHapticImpact, triggerHapticNotification } from '../utils/haptics';
import { useTheme } from '../theme/ThemeContext';
import { AppTheme } from '../theme/theme';

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

const getStatusBadge = (status: TaskStatus, theme: AppTheme) => {
  switch (status) {
    case 'DONE':
      return {
        label: 'Completado',
        bg: theme.colors.successSubtle,
        border: theme.colors.success,
        textColor: theme.colors.success,
        icon: <CheckCircle2 size={13} color={theme.colors.success} />,
      };
    case 'IN_PROGRESS':
      return {
        label: 'En Progreso',
        bg: theme.colors.warningSubtle,
        border: theme.colors.warning,
        textColor: theme.colors.warning,
        icon: <Clock size={13} color={theme.colors.warning} />,
      };
    default:
      return {
        label: 'Por Hacer',
        bg: theme.colors.surfaceElevated,
        border: theme.colors.border,
        textColor: theme.colors.textSecondary,
        icon: <Circle size={13} color={theme.colors.textMuted} />,
      };
  }
};

const getPriorityBadge = (priority: TaskPriority, theme: AppTheme) => {
  switch (priority) {
    case 'HIGH':
      return {
        label: 'Alta',
        textColor: theme.colors.danger,
        bg: theme.colors.dangerSubtle,
        border: theme.colors.danger,
      };
    case 'MEDIUM':
      return {
        label: 'Media',
        textColor: theme.colors.warning,
        bg: theme.colors.warningSubtle,
        border: theme.colors.warning,
      };
    default:
      return {
        label: 'Baja',
        textColor: theme.colors.accent,
        bg: theme.colors.accentSubtle,
        border: theme.colors.accent,
      };
  }
};

export const OptimizedKanbanCard: React.FC<OptimizedKanbanCardProps> = ({
  task,
  onMoveStatus,
  onDelete,
  onDragMoveX,
  onDragEnd,
}) => {
  const { theme } = useTheme();

  // Coordenadas físicas (X, Y) y valores de animación en el UI thread
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);
  const isDragging = useSharedValue(false);

  const isStale = isTaskStale(task);
  const nextStatus = getNextTaskStatus(task.status);
  const prevStatus = getPrevTaskStatus(task.status);

  const triggerMediumHaptic = () => {
    triggerHapticImpact(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleCommitStatus = (status: TaskStatus) => {
    triggerHapticNotification(Haptics.NotificationFeedbackType.Success);
    onMoveStatus(task.id, status);
  };

  const notifyDragMoveX = (absX: number) => {
    onDragMoveX?.(absX);
  };

  const notifyDragEnd = () => {
    onDragEnd?.();
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
      scale.value = withSpring(1.04, { damping: 14, stiffness: 220 });
      zIndex.value = 100;
      isDragging.value = true;
      runOnJS(triggerMediumHaptic)();
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

  const statusBadge = getStatusBadge(task.status, theme);
  const priorityBadge = getPriorityBadge(task.priority, theme);

  return (
    <View
      style={{
        marginBottom: 10,
        position: 'relative',
        borderRadius: theme.metrics.radii.lg,
        overflow: 'hidden',
      }}
    >
      {/* Zona visual de Drop hacia la izquierda (Retroceso Kanban) */}
      <Animated.View
        style={[
          animatedLeftDropStyle,
          {
            position: 'absolute',
            inset: 0,
            backgroundColor: theme.colors.warning,
            borderRadius: theme.metrics.radii.lg,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            justifyContent: 'flex-start',
          },
        ]}
      >
        <ArrowLeft size={18} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12, marginLeft: 8 }}>
          {prevStatus === 'TODO' ? 'Por Hacer' : 'En Progreso'}
        </Text>
      </Animated.View>

      {/* Zona visual de Drop hacia la derecha (Avance Kanban) */}
      <Animated.View
        style={[
          animatedRightDropStyle,
          {
            position: 'absolute',
            inset: 0,
            backgroundColor: theme.colors.success,
            borderRadius: theme.metrics.radii.lg,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            justifyContent: 'flex-end',
          },
        ]}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12, marginRight: 8 }}>
          {nextStatus === 'IN_PROGRESS' ? 'En Progreso' : 'Completado'}
        </Text>
        <ArrowRight size={18} color="#FFFFFF" />
      </Animated.View>

      {/* Tarjeta de Tarea compacta estilizada según el Tema activo */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            animatedCardStyle,
            theme.cardStyle,
            {
              padding: 13,
              borderRadius: theme.metrics.radii.lg,
              backgroundColor: theme.colors.cardBg,
              borderColor: isStale ? theme.colors.warning : theme.colors.border,
              borderWidth: theme.metrics.borderWidth,
            },
          ]}
        >
          {/* Fila Superior: Badges y Acciones */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleCommitStatus(cycleTaskStatus(task.status))}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: theme.metrics.radii.full,
                  backgroundColor: statusBadge.bg,
                  borderColor: statusBadge.border,
                  borderWidth: 1,
                }}
              >
                {statusBadge.icon}
                <Text style={{ fontSize: 11, fontWeight: '600', marginLeft: 4, color: statusBadge.textColor }}>
                  {statusBadge.label}
                </Text>
              </TouchableOpacity>

              <View
                style={{
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: theme.metrics.radii.sm,
                  marginLeft: 6,
                  backgroundColor: priorityBadge.bg,
                  borderColor: priorityBadge.border,
                  borderWidth: 1,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: priorityBadge.textColor, textTransform: 'uppercase' }}>
                  {priorityBadge.label}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {onDelete && (
                <TouchableOpacity
                  onPress={() => onDelete(task.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ padding: 4, marginRight: 4 }}
                >
                  <Trash2 size={13} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
              <GripVertical size={14} color={theme.colors.textMuted} />
            </View>
          </View>

          {/* Título de la tarea */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: theme.typography.titleWeight,
              color: task.status === 'DONE' ? theme.colors.textMuted : theme.colors.text,
              textDecorationLine: task.status === 'DONE' ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </Text>

          {/* Descripción opcional */}
          {Boolean(task.description) && (
            <Text
              style={{
                fontSize: 12,
                color: theme.colors.textMuted,
                marginTop: 4,
                lineHeight: 17,
              }}
              numberOfLines={2}
            >
              {task.description}
            </Text>
          )}

          {/* Metadatos inferiores: Fecha límite y alerta de estancamiento */}
          {(Boolean(task.due_date) || isStale) && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 8,
                paddingTop: 6,
                borderTopColor: theme.colors.borderSubtle,
                borderTopWidth: 1,
                flexWrap: 'wrap',
              }}
            >
              {Boolean(task.due_date) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                  <Calendar size={11} color={theme.colors.textMuted} />
                  <Text style={{ fontSize: 10, color: theme.colors.textMuted, fontWeight: '500', marginLeft: 4 }}>
                    Vence: {task.due_date?.substring(0, 10)}
                  </Text>
                </View>
              )}
              {isStale && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.colors.warningSubtle,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: theme.metrics.radii.sm,
                    borderColor: theme.colors.warning,
                    borderWidth: 1,
                  }}
                >
                  <AlertTriangle size={10} color={theme.colors.warning} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.warning, marginLeft: 4 }}>
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
