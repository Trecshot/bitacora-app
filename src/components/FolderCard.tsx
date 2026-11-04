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
  Folder as FolderIcon,
  ChevronRight,
  CheckSquare,
  Trash2,
  AlertTriangle,
} from 'lucide-react-native';
import { Folder } from '../db/database';

interface FolderCardProps {
  folder: Folder;
  onPress: () => void;
  onDelete?: (id: number) => void;
}

const SWIPE_OPEN_WIDTH = -88;
const SWIPE_THRESHOLD = -45;
const FULL_SWIPE_DELETE_THRESHOLD = -170;

export const FolderCard: React.FC<FolderCardProps> = ({ folder, onPress, onDelete }) => {
  const accentColor = folder.color || '#3B82F6';
  const staleCount = folder.stale_task_count ?? 0;
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const handleConfirmDelete = () => {
    triggerHaptic();
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
        runOnJS(triggerHaptic)();
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
    <View className="mb-3 relative rounded-2xl overflow-hidden bg-rose-600">
      {/* Fondo de Acción: Swipe to Delete */}
      {onDelete && (
        <Animated.View
          style={[animatedDeleteActionStyle]}
          className="absolute right-0 top-0 bottom-0 w-[92px] items-center justify-center"
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleConfirmDelete}
            className="w-full h-full items-center justify-center px-2"
          >
            <Trash2 size={18} color="#FFFFFF" />
            <Text className="text-[11px] font-bold text-white mt-1">Eliminar</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Tarjeta Deslizable */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[animatedCardStyle, styles.cardShadow]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCardPress}
            className={`bg-white rounded-2xl p-4 border flex-row items-center justify-between ${
              staleCount > 0 ? 'border-amber-300/90' : 'border-slate-100'
            }`}
          >
            <View className="flex-row items-center flex-1 mr-4">
              {/* Icon Container con color dinámico */}
              <View
                className="w-12 h-12 rounded-xl items-center justify-center mr-3.5"
                style={{ backgroundColor: `${accentColor}18` }}
              >
                <FolderIcon size={24} color={accentColor} />
              </View>

              {/* Textos informativos */}
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text
                    className="text-base font-semibold text-slate-800 flex-shrink"
                    numberOfLines={1}
                  >
                    {folder.name}
                  </Text>
                  <View
                    className="w-2.5 h-2.5 rounded-full ml-2"
                    style={{ backgroundColor: accentColor }}
                  />
                </View>

                <View className="flex-row items-center mt-1 flex-wrap">
                  <View className="flex-row items-center mr-3.5">
                    <CheckSquare size={13} color="#94A3B8" />
                    <Text className="text-xs text-slate-500 ml-1 font-medium">
                      {folder.task_count ?? 0} tareas
                    </Text>
                  </View>
                  {(folder.subfolder_count ?? 0) > 0 && (
                    <View className="flex-row items-center mr-3.5">
                      <FolderIcon size={12} color="#94A3B8" />
                      <Text className="text-xs text-slate-500 ml-1 font-medium">
                        {folder.subfolder_count} subcarpetas
                      </Text>
                    </View>
                  )}

                  {/* Alerta visual de Métricas de Estancamiento (Stale Tasks > 7 días) */}
                  {staleCount > 0 && (
                    <View className="flex-row items-center bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-0.5">
                      <AlertTriangle size={11} color="#D97706" />
                      <Text className="text-[10px] font-bold text-amber-700 ml-1">
                        {staleCount} estancada{staleCount === 1 ? '' : 's'} (&gt;7d)
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Indicador de navegación con área de separación holgada */}
            <View className="pl-3 pr-1 py-2 items-center justify-center">
              <ChevronRight size={20} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});
