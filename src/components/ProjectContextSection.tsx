import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  BookOpen,
  ChevronDown,
  Edit3,
  Check,
  Sparkles,
  CheckCircle2,
} from 'lucide-react-native';
import { updateFolderDescriptionAsync } from '../db/database';
import { triggerHapticImpact } from '../utils/haptics';
import { useTheme } from '../theme/ThemeContext';

interface ProjectContextSectionProps {
  folderId: number;
  initialDescription?: string;
  onDescriptionSaved?: (newDescription: string) => void;
}

const DEBOUNCE_DELAY_MS = 500;

export const ProjectContextSection: React.FC<ProjectContextSectionProps> = ({
  folderId,
  initialDescription = '',
  onDescriptionSaved,
}) => {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [draftDescription, setDraftDescription] = useState(initialDescription);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<number>(0);
  const latestDraftRef = useRef(initialDescription);

  const currentDescription = isEditing ? draftDescription : initialDescription;

  // Animación del chevron con Reanimated
  const chevronRotation = useSharedValue(1); // 1 = expandido (0 deg), 0 = colapsado (-90 deg)

  useEffect(() => {
    chevronRotation.value = withTiming(isExpanded ? 1 : 0, { duration: 220 });
  }, [isExpanded, chevronRotation]);

  // Limpiar temporizador al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const animatedChevronStyle = useAnimatedStyle(() => {
    'worklet';
    const angle = (1 - chevronRotation.value) * -90;
    return {
      transform: [{ rotate: `${angle}deg` }],
    };
  });

  /**
   * Persistencia diferida hacia SQLite (Modo WAL)
   */
  const persistToSQLite = useCallback(
    async (textToSave: string) => {
      try {
        setSaveStatus('saving');
        onDescriptionSaved?.(textToSave);
        await updateFolderDescriptionAsync(folderId, textToSave);
        setSaveStatus('saved');
        setTimeout(() => {
          setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
        }, 1400);
      } catch (err) {
        console.error('Error persistiendo descripción de carpeta en SQLite:', err);
        setSaveStatus('idle');
      }
    },
    [folderId, onDescriptionSaved]
  );

  const handleTextChange = (text: string) => {
    setDraftDescription(text);
    latestDraftRef.current = text;
    setSaveStatus('saving');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      persistToSQLite(text);
    }, DEBOUNCE_DELAY_MS);
  };

  const startEditing = () => {
    setDraftDescription(initialDescription);
    latestDraftRef.current = initialDescription;
    setIsEditing(true);
    setIsExpanded(true);
  };

  const stopEditingAndPersist = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    persistToSQLite(latestDraftRef.current);
    setIsEditing(false);
  };

  const toggleEditing = () => {
    triggerHapticImpact();
    if (isEditing) {
      stopEditingAndPersist();
    } else {
      startEditing();
    }
  };

  const toggleExpand = () => {
    triggerHapticImpact();
    if (isEditing) {
      stopEditingAndPersist();
    }
    setIsExpanded((prev) => !prev);
  };

  const handleBlur = () => {
    if (isEditing) {
      stopEditingAndPersist();
    }
  };

  // Detección de doble tap en modo lectura para conmutar edición in-situ
  const handleContentPress = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      triggerHapticImpact(Haptics.ImpactFeedbackStyle.Medium);
      startEditing();
    }
    lastTapRef.current = now;
  };

  const hasContent = Boolean(currentDescription && currentDescription.trim().length > 0);

  return (
    <View style={[theme.cardStyle, { marginBottom: 16, overflow: 'hidden' }]}>
      {/* Cabecera de la Sección Expandible */}
      <View
        className="flex-row items-center justify-between px-4 py-3 border-b"
        style={{
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={toggleExpand}
          className="flex-row items-center flex-1 mr-2"
        >
          <View
            className="w-8 h-8 rounded-xl items-center justify-center mr-2.5 border"
            style={{
              backgroundColor: `${theme.colors.accent}15`,
              borderColor: `${theme.colors.accent}30`,
            }}
          >
            <BookOpen size={16} color={theme.colors.accent} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text
                className="text-sm font-bold mr-2"
                style={{ color: theme.colors.text }}
              >
                Contexto del Proyecto
              </Text>
              {saveStatus === 'saved' && (
                <View
                  className="flex-row items-center px-1.5 py-0.5 rounded-md border"
                  style={{
                    backgroundColor: `${theme.colors.success}18`,
                    borderColor: `${theme.colors.success}40`,
                  }}
                >
                  <CheckCircle2 size={10} color={theme.colors.success} />
                  <Text
                    className="text-[10px] font-semibold ml-1"
                    style={{ color: theme.colors.success }}
                  >
                    Guardado
                  </Text>
                </View>
              )}
              {saveStatus === 'saving' && (
                <Text
                  className="text-[10px] font-medium"
                  style={{ color: theme.colors.textMuted }}
                >
                  Guardando...
                </Text>
              )}
            </View>
            {!isExpanded && hasContent && (
              <Text
                className="text-xs mt-0.5"
                style={{ color: theme.colors.textMuted }}
                numberOfLines={1}
              >
                {currentDescription.trim()}
              </Text>
            )}
          </View>

          <Animated.View style={animatedChevronStyle} className="p-1">
            <ChevronDown size={18} color={theme.colors.textMuted} />
          </Animated.View>
        </TouchableOpacity>

        {/* Botón de alternancia de Edición In-Situ */}
        <TouchableOpacity
          onPress={toggleEditing}
          activeOpacity={0.7}
          className="flex-row items-center px-2.5 py-1.5 rounded-xl border"
          style={{
            backgroundColor: isEditing ? theme.colors.accent : theme.colors.surfaceElevated,
            borderColor: isEditing ? theme.colors.accent : theme.colors.border,
          }}
        >
          {isEditing ? (
            <>
              <Check size={13} color={theme.colors.accentText} />
              <Text
                className="text-xs font-semibold ml-1"
                style={{ color: theme.colors.accentText }}
              >
                Listo
              </Text>
            </>
          ) : (
            <>
              <Edit3 size={13} color={theme.colors.textSecondary} />
              <Text
                className="text-xs font-semibold ml-1"
                style={{ color: theme.colors.textSecondary }}
              >
                Editar
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Contenido Expandible: Editor Multilínea vs Visor de Texto Nativo */}
      {isExpanded && (
        <View className="p-4">
          {isEditing ? (
            <View>
              <TextInput
                multiline={true}
                scrollEnabled={false}
                textAlignVertical="top"
                autoCorrect={true}
                spellCheck={true}
                value={draftDescription}
                onChangeText={handleTextChange}
                onBlur={handleBlur}
                placeholder="Escribe la visión, notas clave u objetivos del proyecto..."
                placeholderTextColor={theme.colors.textMuted}
                className="text-sm p-3.5 rounded-2xl border min-h-[110px] leading-relaxed"
                style={{
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }}
                autoFocus
              />
              <View className="flex-row items-center justify-between mt-2 px-1">
                <Text className="text-[11px]" style={{ color: theme.colors.textMuted }}>
                  Captura directa sin sobrecarga
                </Text>
                <Text
                  className="text-[11px] font-medium"
                  style={{ color: theme.colors.textMuted }}
                >
                  {draftDescription.length} caracteres
                </Text>
              </View>
            </View>
          ) : (
            <Pressable onPress={handleContentPress}>
              {hasContent ? (
                <View className="min-h-[40px]">
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: 14,
                      lineHeight: 22,
                    }}
                  >
                    {currentDescription}
                  </Text>
                  <View
                    className="mt-2 pt-2 border-t flex-row items-center justify-end"
                    style={{ borderColor: theme.colors.border }}
                  >
                    <Text className="text-[10px]" style={{ color: theme.colors.textMuted }}>
                      Toca dos veces para editar
                    </Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    triggerHapticImpact();
                    startEditing();
                  }}
                  className="py-5 items-center justify-center border-2 border-dashed rounded-2xl"
                  style={{
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surfaceElevated,
                  }}
                >
                  <Sparkles size={20} color={theme.colors.textMuted} />
                  <Text
                    className="text-xs font-semibold mt-1.5"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Añadir contexto o idea del proyecto
                  </Text>
                  <Text
                    className="text-[11px] mt-0.5 text-center px-4"
                    style={{ color: theme.colors.textMuted }}
                  >
                    Documenta objetivos, visión o referencias clave.
                  </Text>
                </TouchableOpacity>
              )}
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};
