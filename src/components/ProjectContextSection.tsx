import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Platform,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Markdown from 'react-native-markdown-display';
import {
  BookOpen,
  ChevronDown,
  Edit3,
  Check,
  Sparkles,
  CheckCircle2,
} from 'lucide-react-native';
import { updateFolderDescriptionAsync } from '../db/database';

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
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [draftDescription, setDraftDescription] = useState(initialDescription);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<number>(0);
  const latestDraftRef = useRef(draftDescription);
  latestDraftRef.current = draftDescription;

  // Sincronizar si cambia initialDescription externamente
  useEffect(() => {
    if (!isEditing) {
      setDraftDescription(initialDescription || '');
    }
  }, [initialDescription, isEditing]);

  // Animación del chevron con Reanimated
  const chevronRotation = useSharedValue(1); // 1 = expandido (0 deg), 0 = colapsado (-90 deg)

  useEffect(() => {
    chevronRotation.value = withTiming(isExpanded ? 1 : 0, { duration: 220 });
  }, [isExpanded, chevronRotation]);

  const animatedChevronStyle = useAnimatedStyle(() => {
    'worklet';
    const angle = (1 - chevronRotation.value) * -90;
    return {
      transform: [{ rotate: `${angle}deg` }],
    };
  });

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(style).catch(() => {});
    }
  };

  /**
   * Persistencia diferida hacia SQLite (Modo WAL)
   */
  const persistToSQLite = useCallback(
    async (textToSave: string) => {
      try {
        setSaveStatus('saving');
        await updateFolderDescriptionAsync(folderId, textToSave);
        setSaveStatus('saved');
        if (onDescriptionSaved) {
          onDescriptionSaved(textToSave);
        }
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
    setSaveStatus('saving');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      persistToSQLite(text);
      debounceTimerRef.current = null;
    }, DEBOUNCE_DELAY_MS);
  };

  const handleBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    persistToSQLite(latestDraftRef.current);
  };

  const toggleEditing = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (isEditing) {
      // Guardar y salir
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      persistToSQLite(latestDraftRef.current);
      setIsEditing(false);
    } else {
      setIsEditing(true);
      if (!isExpanded) {
        setIsExpanded(true);
      }
    }
  };

  const toggleExpand = () => {
    triggerHaptic();
    setIsExpanded((prev) => !prev);
  };

  // Detección de doble tap en modo lectura para conmutar edición in-situ
  const handleContentPress = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      setIsEditing(true);
      if (!isExpanded) {
        setIsExpanded(true);
      }
    }
    lastTapRef.current = now;
  };

  const hasContent = Boolean(draftDescription && draftDescription.trim().length > 0);

  return (
    <View className="bg-white rounded-3xl mb-4 border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Cabecera de la Sección Expandible */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-slate-50/70 border-b border-slate-100">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={toggleExpand}
          className="flex-row items-center flex-1 mr-2"
        >
          <View className="w-8 h-8 rounded-xl bg-blue-50 items-center justify-center mr-2.5 border border-blue-100">
            <BookOpen size={16} color="#2563EB" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-sm font-bold text-slate-800 mr-2">
                Contexto del Proyecto
              </Text>
              {saveStatus === 'saved' && (
                <View className="flex-row items-center bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                  <CheckCircle2 size={10} color="#059669" />
                  <Text className="text-[10px] text-emerald-700 font-semibold ml-1">
                    Guardado
                  </Text>
                </View>
              )}
              {saveStatus === 'saving' && (
                <Text className="text-[10px] text-slate-400 font-medium">
                  Guardando...
                </Text>
              )}
            </View>
            {!isExpanded && hasContent && (
              <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={1}>
                {draftDescription.replace(/[#*`_]/g, '').trim()}
              </Text>
            )}
          </View>

          <Animated.View style={animatedChevronStyle} className="p-1">
            <ChevronDown size={18} color="#94A3B8" />
          </Animated.View>
        </TouchableOpacity>

        {/* Botón de alternancia de Edición In-Situ */}
        <TouchableOpacity
          onPress={toggleEditing}
          activeOpacity={0.7}
          className={`flex-row items-center px-2.5 py-1.5 rounded-xl border ${
            isEditing
              ? 'bg-emerald-600 border-emerald-600'
              : 'bg-white border-slate-200/90 shadow-sm'
          }`}
        >
          {isEditing ? (
            <>
              <Check size={13} color="#FFFFFF" />
              <Text className="text-xs font-semibold text-white ml-1">Listo</Text>
            </>
          ) : (
            <>
              <Edit3 size={13} color="#475569" />
              <Text className="text-xs font-semibold text-slate-700 ml-1">Editar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Contenido Expandible: Editor Multilínea vs Visor Markdown */}
      {isExpanded && (
        <View className="p-4">
          {isEditing ? (
            <View>
              <TextInput
                multiline
                scrollEnabled={false}
                value={draftDescription}
                onChangeText={handleTextChange}
                onBlur={handleBlur}
                placeholder="Escribe la visión, notas clave, objetivos o ideas del proyecto... (Soporta formato Markdown: # Títulos, **negrita**, - listas)"
                placeholderTextColor="#94A3B8"
                textAlignVertical="top"
                className="text-sm text-slate-800 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 min-h-[110px] leading-relaxed"
                autoFocus
              />
              <View className="flex-row items-center justify-between mt-2 px-1">
                <Text className="text-[11px] text-slate-400">
                  Soporta Markdown (# títulos, **negrita**, - listas)
                </Text>
                <Text className="text-[11px] text-slate-400 font-medium">
                  {draftDescription.length} caracteres
                </Text>
              </View>
            </View>
          ) : (
            <Pressable onPress={handleContentPress}>
              {hasContent ? (
                <View className="min-h-[40px]">
                  <Markdown style={markdownStyles}>{draftDescription}</Markdown>
                  <View className="mt-2 pt-2 border-t border-slate-100 flex-row items-center justify-end">
                    <Text className="text-[10px] text-slate-400">
                      Toca dos veces para editar
                    </Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    triggerHaptic();
                    setIsEditing(true);
                  }}
                  className="py-5 items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50"
                >
                  <Sparkles size={20} color="#94A3B8" />
                  <Text className="text-xs font-semibold text-slate-600 mt-1.5">
                    Añadir contexto o idea del proyecto
                  </Text>
                  <Text className="text-[11px] text-slate-400 mt-0.5 text-center px-4">
                    Documenta objetivos, visión o referencias clave con formato Markdown.
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

const markdownStyles = StyleSheet.create({
  body: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 20,
  },
  heading1: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 4,
  },
  heading2: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 4,
  },
  heading3: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 2,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 6,
    color: '#334155',
  },
  list_item: {
    marginVertical: 2,
    color: '#334155',
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  code_inline: {
    backgroundColor: '#F1F5F9',
    color: '#2563EB',
    borderRadius: 4,
    paddingHorizontal: 4,
    fontSize: 12,
  },
  code_block: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginVertical: 6,
    fontSize: 12,
  },
  link: {
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  blockquote: {
    backgroundColor: '#F8FAFC',
    borderLeftColor: '#3B82F6',
    borderLeftWidth: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginVertical: 4,
  },
  hr: {
    backgroundColor: '#E2E8F0',
    height: 1,
    marginVertical: 8,
  },
});
