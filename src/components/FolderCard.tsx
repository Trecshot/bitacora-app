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
import {
  Folder as FolderIcon,
  ChevronRight,
  CheckSquare,
  Trash2,
  AlertTriangle,
} from 'lucide-react-native';
import { Folder } from '../db/database';
import { DEFAULT_FOLDER_COLOR } from '../utils/dateAndTaskUtils';
import { triggerHapticImpact } from '../utils/haptics';
import { useTheme } from '../theme/ThemeContext';

interface FolderCardProps {
  folder: Folder;
  onPress: () => void;
  onDelete?: (id: number) => void;
}

const SWIPE_OPEN_WIDTH = -88;
const SWIPE_THRESHOLD = -45;
const FULL_SWIPE_DELETE_THRESHOLD = -170;

export const FolderCard: React.FC<FolderCardProps> = ({ folder, onPress, onDelete }) => {
  const { theme } = useTheme();
  const accentColor = folder.color || DEFAULT_FOLDER_COLOR;
  const staleCount = folder.stale_task_count ?? 0;
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const handleConfirmDelete = () => {
    triggerHapticImpact();
    translateX.value = withSpring(0, { damping: 20, stiffness: 220 });
    if (onDelete) {
      onDelete(folder.id);
    }
  };

  const panGesture = Gesture.Pan()
    .enabled(Boolean(onDelete))
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .onStart(() => {
      'worklet';
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      'worklet';
      const nextX = startX.value + event.translationX;
      // Permitir deslizar hacia la izquierda con resistencia suave
      translateX.value = Math.min(0, Math.max(-200, nextX));
    })
    .onEnd(() => {
      'worklet';
      if (translateX.value < FULL_SWIPE_DELETE_THRESHOLD) {
        runOnJS(handleConfirmDelete)();
      } else if (translateX.value < SWIPE_THRESHOLD) {
        translateX.value = withSpring(SWIPE_OPEN_WIDTH, { damping: 18, stiffness: 220 });
        runOnJS(triggerHapticImpact)();
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 240 });
      }
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const animatedDeleteActionStyle = useAnimatedStyle(() => {
    'worklet';
    const opacity = interpolate(
      translateX.value,
      [0, -25, SWIPE_OPEN_WIDTH],
      [0, 0.7, 1],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [0, SWIPE_OPEN_WIDTH],
      [0.85, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const handleCardPress = () => {
    if (translateX.get() < -10) {
      translateX.set(withSpring(0, { damping: 20, stiffness: 240 }));
      return;
    }
    onPress();
  };

  return (
    <View
      style={{
        marginBottom: 12,
        position: 'relative',
        borderRadius: theme.metrics.radii.lg,
        overflow: 'hidden',
        backgroundColor: theme.colors.danger,
      }}
    >
      {/* Fondo de Acción: Swipe to Delete */}
      {onDelete && (
        <Animated.View
          style={[
            animatedDeleteActionStyle,
            {
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 92,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleConfirmDelete}
            style={{
              width: '100%',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
            }}
          >
            <Trash2 size={18} color="#FFFFFF" />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>
              Eliminar
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Tarjeta Deslizable con Estilo de Tema */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[animatedCardStyle, theme.cardStyle]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCardPress}
            style={{
              padding: 14,
              borderRadius: theme.metrics.radii.lg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: theme.colors.surface,
              borderColor:
                staleCount > 0 ? theme.colors.warning : theme.colors.border,
              borderWidth: theme.metrics.borderWidth,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 16 }}>
              {/* Icon Container con color dinámico */}
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: theme.metrics.radii.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                  backgroundColor: `${accentColor}18`,
                }}
              >
                <FolderIcon size={22} color={accentColor} />
              </View>

              {/* Textos informativos */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: theme.typography.titleWeight,
                      color: theme.colors.text,
                      flexShrink: 1,
                    }}
                    numberOfLines={1}
                  >
                    {folder.name}
                  </Text>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: theme.metrics.radii.full,
                      marginLeft: 8,
                      backgroundColor: accentColor,
                    }}
                  />
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14 }}>
                    <CheckSquare size={13} color={theme.colors.textMuted} />
                    <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginLeft: 4, fontWeight: '500' }}>
                      {folder.task_count ?? 0} tareas
                    </Text>
                  </View>
                  {(folder.subfolder_count ?? 0) > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14 }}>
                      <FolderIcon size={12} color={theme.colors.textMuted} />
                      <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginLeft: 4, fontWeight: '500' }}>
                        {folder.subfolder_count} subcarpetas
                      </Text>
                    </View>
                  )}

                  {/* Alerta visual de Métricas de Estancamiento */}
                  {staleCount > 0 && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: theme.colors.warningSubtle,
                        borderColor: theme.colors.warning,
                        borderWidth: 1,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: theme.metrics.radii.full,
                        marginTop: 2,
                      }}
                    >
                      <AlertTriangle size={11} color={theme.colors.warning} />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.warning, marginLeft: 4 }}>
                        {staleCount} estancada{staleCount === 1 ? '' : 's'} (&gt;7d)
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Indicador de navegación */}
            <View style={{ paddingLeft: 8, paddingRight: 4, alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={18} color={theme.colors.textMuted} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};
