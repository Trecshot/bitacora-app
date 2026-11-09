import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect, Stack } from 'expo-router';
import {
  ArrowLeft,
  Pin,
  Check,
  Trash2,
  Tag as TagIcon,
  Clock,
  Plus,
  Cloud,
} from 'lucide-react-native';
import {
  getNoteById,
  createNote,
  createNoteAsync,
  updateNote,
  updateNoteAsync,
  deleteNote,
  getAllNoteCategories,
  getAllTags,
  createTag,
  setNoteTags,
  setNoteTagsAsync,
  generateUUID,
  NoteCategory,
  Tag,
} from '../../src/db/database';
import { FOLDER_COLORS, formatCurrentTime } from '../../src/utils/dateAndTaskUtils';
import { useTheme } from '../../src/theme/ThemeContext';
import { ThemeSelectorPill } from '../../src/components/ThemeSelectorPill';

export default function NoteEditorScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id: routeId, categoryId: initialCategoryId, tagId: initialTagId } =
    useLocalSearchParams<{
      id?: string;
      categoryId?: string;
      tagId?: string;
    }>();

  // ID persistente para la nota (evita mutaciones duplicadas durante autoguardado)
  const noteIdRef = useRef<string>(routeId || generateUUID());
  const isExistingInDbRef = useRef<boolean>(Boolean(routeId));
  const [isExistingInDb, setIsExistingInDb] = useState<boolean>(Boolean(routeId));
  const isInitialLoadedRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estados del Documento Nativo
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Metadatos de Taxonomía
  const [categories, setCategories] = useState<NoteCategory[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // Estado del Autoguardado Asíncrono
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const loadEditorData = useCallback(() => {
    try {
      const allCats = getAllNoteCategories();
      const allTgs = getAllTags();
      setCategories(allCats);
      setAvailableTags(allTgs);

      if (routeId) {
        const existingNote = getNoteById(routeId);
        if (existingNote) {
          setTitle(existingNote.title || '');
          setContent(existingNote.content || '');
          setIsPinned(existingNote.is_pinned === 1);
          setSelectedCategoryId(existingNote.category_id);
          const noteTags: Tag[] = existingNote.tags || [];
          setSelectedTagIds(noteTags.map((t: Tag) => t.id));
          setLastSavedTime(
            existingNote.updated_at ? existingNote.updated_at.split(' ')[1] : null
          );
          isExistingInDbRef.current = true;
          setIsExistingInDb(true);
        }
      } else {
        // Nueva nota
        if (initialCategoryId && initialCategoryId !== 'ALL') {
          setSelectedCategoryId(initialCategoryId);
        } else if (allCats.length > 0) {
          setSelectedCategoryId(allCats[0].id);
        }

        if (initialTagId) {
          setSelectedTagIds([initialTagId]);
        }
      }
      isInitialLoadedRef.current = true;
    } catch (e) {
      console.error('Error cargando datos en editor de notas:', e);
    }
  }, [routeId, initialCategoryId, initialTagId]);

  useFocusEffect(
    useCallback(() => {
      loadEditorData();
    }, [loadEditorData])
  );

  /**
   * Persistencia Asíncrona (Autosave en segundo plano hacia SQLite WAL)
   * Envía el payload a SQLite sin bloquear el hilo principal (UI Thread).
   */
  const executeAutosave = useCallback(
    async (
      targetTitle: string,
      targetContent: string,
      catId: string,
      pinned: boolean,
      tagsArr: string[]
    ) => {
      if (!isExistingInDbRef.current && !targetTitle.trim() && !targetContent.trim()) {
        setSaveStatus('unsaved');
        return;
      }

      if (!catId) return;

      setSaveStatus('saving');
      try {
        const finalTitle = targetTitle.trim() || 'Sin Título';

        if (isExistingInDbRef.current) {
          await updateNoteAsync(noteIdRef.current, finalTitle, targetContent, catId, pinned);
        } else {
          await createNoteAsync(catId, finalTitle, targetContent, pinned, noteIdRef.current);
          isExistingInDbRef.current = true;
          setIsExistingInDb(true);
        }

        await setNoteTagsAsync(noteIdRef.current, tagsArr);

        setLastSavedTime(formatCurrentTime());
        setSaveStatus('saved');
      } catch (err) {
        console.error('Error en autoguardado asíncrono SQLite:', err);
        setSaveStatus('unsaved');
      }
    },
    []
  );

  // Activación del patrón debounce (~700ms) al modificar cualquier campo del documento
  useEffect(() => {
    if (!isInitialLoadedRef.current) return;

    setSaveStatus('unsaved');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeAutosave(title, content, selectedCategoryId, isPinned, selectedTagIds);
    }, 700);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [title, content, selectedCategoryId, isPinned, selectedTagIds, executeAutosave]);

  // Al salir o volver atrás, asegurar persistencia inmediata sin pérdida de datos
  const handleBack = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if ((title.trim() || content.trim()) && selectedCategoryId) {
      try {
        const finalTitle = title.trim() || 'Sin Título';
        if (isExistingInDbRef.current) {
          updateNote(noteIdRef.current, finalTitle, content, selectedCategoryId, isPinned);
        } else {
          createNote(selectedCategoryId, finalTitle, content, isPinned, noteIdRef.current);
          isExistingInDbRef.current = true;
          setIsExistingInDb(true);
        }
        setNoteTags(noteIdRef.current, selectedTagIds);
      } catch (err) {
        console.warn('Error en persistencia final al salir:', err);
      }
    }
    router.back();
  };

  // Creación dinámica de etiquetas (Tags) con prevención de duplicados
  const handleCreateTag = () => {
    if (!newTagInput.trim()) return;
    try {
      const randomColor = FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)];
      const created = createTag(newTagInput.trim(), randomColor);
      setAvailableTags((prev) =>
        prev.some((t) => t.id === created.id) ? prev : [...prev, created]
      );
      setSelectedTagIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
      setNewTagInput('');
    } catch (e) {
      console.error('Error al crear tag:', e);
    }
  };

  const handleToggleTagSelection = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleDelete = () => {
    if (!routeId && !isExistingInDbRef.current) {
      router.back();
      return;
    }
    Alert.alert(
      'Eliminar Nota',
      '¿Estás seguro de que deseas eliminar esta nota permanentemente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            try {
              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
              deleteNote(noteIdRef.current);
              router.back();
            } catch {
              Alert.alert('Error', 'No se pudo eliminar la nota.');
            }
          },
        },
      ]
    );
  };

  const currentCategoryName =
    categories.find((c) => c.id === selectedCategoryId)?.name || 'Seleccionar categoría';

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  const renderAssignedTagBadges = () => {
    if (selectedTagIds.length === 0) return null;
    return (
      <View className="flex-row flex-wrap gap-1 px-4 mb-2">
        {selectedTagIds.map((tid) => {
          const tagObj = availableTags.find((t) => t.id === tid);
          if (!tagObj) return null;
          return (
            <View
              key={tid}
              className="flex-row items-center px-2 py-0.5 rounded-md border"
              style={{
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              }}
            >
              <View
                className="w-1.5 h-1.5 rounded-full mr-1"
                style={{ backgroundColor: tagObj.color || theme.colors.accent }}
              />
              <Text
                className="text-[10px] font-semibold"
                style={{ color: theme.colors.text }}
              >
                {tagObj.name}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Barra Superior de Navegación y Acciones */}
      <View
        className="px-4 py-2.5 flex-row items-center justify-between border-b"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={handleBack}
            className="w-9 h-9 rounded-full items-center justify-center mr-2 border"
            style={{
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            }}
          >
            <ArrowLeft size={18} color={theme.colors.text} />
          </TouchableOpacity>

          {/* Estado de Persistencia Asíncrona (Autosave Debounced) */}
          <View
            className="flex-row items-center px-2.5 py-1 rounded-lg border"
            style={{
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            }}
          >
            {saveStatus === 'saving' && (
              <>
                <ActivityIndicator
                  size="small"
                  color={theme.colors.accent}
                  style={{ transform: [{ scale: 0.7 }] }}
                />
                <Text
                  className="text-[10px] font-semibold ml-1"
                  style={{ color: theme.colors.accent }}
                >
                  Guardando...
                </Text>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check size={12} color={theme.colors.success} />
                <Text
                  className="text-[10px] font-medium ml-1"
                  style={{ color: theme.colors.success }}
                >
                  {lastSavedTime ? `Guardado ${lastSavedTime}` : 'Guardado'}
                </Text>
              </>
            )}
            {saveStatus === 'unsaved' && (
              <>
                <Cloud size={12} color={theme.colors.textMuted} />
                <Text
                  className="text-[10px] font-medium ml-1"
                  style={{ color: theme.colors.textMuted }}
                >
                  Editando...
                </Text>
              </>
            )}
          </View>
        </View>

        <View className="flex-row items-center space-x-1.5">
          {/* Selector de Tema */}
          <View className="mr-1">
            <ThemeSelectorPill compact />
          </View>

          {/* Fijar Nota */}
          <TouchableOpacity
            onPress={() => setIsPinned(!isPinned)}
            activeOpacity={0.7}
            className="p-1.5 rounded-full border"
            style={{
              backgroundColor: isPinned
                ? 'rgba(245, 158, 11, 0.15)'
                : theme.colors.surfaceElevated,
              borderColor: isPinned ? '#F59E0B' : theme.colors.border,
            }}
          >
            <Pin
              size={16}
              color={isPinned ? '#D97706' : theme.colors.textMuted}
              fill={isPinned ? '#F59E0B' : 'none'}
            />
          </TouchableOpacity>

          {/* Eliminar Nota */}
          {isExistingInDb && (
            <TouchableOpacity
              onPress={handleDelete}
              className="p-1.5 rounded-full border ml-1"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                borderColor: 'rgba(239, 68, 68, 0.25)',
              }}
            >
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          )}

          {/* Botón Listo / Guardar */}
          <TouchableOpacity
            onPress={handleBack}
            className="p-1.5 rounded-full ml-1"
            style={{ backgroundColor: theme.colors.accent }}
          >
            <Check size={16} color={theme.colors.accentText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de Taxonomía: Selector de Categoría & Etiquetas Dinámicas */}
      <View
        className="px-4 py-2 border-b flex-row items-center justify-between"
        style={{
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
        }}
      >
        <View className="flex-row items-center flex-1 mr-2">
          {/* Categoría */}
          <TouchableOpacity
            onPress={() => setShowCategorySelector(!showCategorySelector)}
            className="flex-row items-center px-2.5 py-1 rounded-xl border mr-2"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <TagIcon size={12} color={theme.colors.accent} />
            <Text
              className="text-xs font-semibold ml-1 max-w-[120px]"
              style={{ color: theme.colors.text }}
              numberOfLines={1}
            >
              {currentCategoryName}
            </Text>
          </TouchableOpacity>

          {/* Selector de Tags */}
          <TouchableOpacity
            onPress={() => setShowTagSelector(!showTagSelector)}
            className="flex-row items-center px-2 py-1 rounded-xl border"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <Plus size={11} color={theme.colors.textMuted} />
            <Text
              className="text-[11px] font-semibold ml-1"
              style={{ color: theme.colors.textSecondary }}
            >
              {selectedTagIds.length === 0
                ? 'Tags'
                : `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? 's' : ''}`}
            </Text>
          </TouchableOpacity>
        </View>

        {Boolean(lastSavedTime) && (
          <View className="flex-row items-center">
            <Clock size={11} color={theme.colors.textMuted} />
            <Text className="text-[10px] ml-1" style={{ color: theme.colors.textMuted }}>
              Auto: {lastSavedTime}
            </Text>
          </View>
        )}
      </View>

      {/* Dropdown de Categorías */}
      {showCategorySelector && (
        <View
          className="border-b max-h-48 px-4 py-2"
          style={{
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
          }}
        >
          <ScrollView showsVerticalScrollIndicator={true}>
            {categories.map((c) => {
              const isSelected = selectedCategoryId === c.id;
              const isChild = c.parent_id !== null;
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => {
                    setSelectedCategoryId(c.id);
                    setShowCategorySelector(false);
                  }}
                  className="py-2 px-3 rounded-lg mb-1 flex-row items-center justify-between border"
                  style={{
                    backgroundColor: isSelected ? theme.colors.accent : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                  }}
                >
                  <Text
                    className={`text-xs ${isChild ? 'pl-3' : 'font-semibold'}`}
                    style={{
                      color: isSelected ? theme.colors.accentText : theme.colors.text,
                      fontWeight: isSelected ? '700' : '500',
                    }}
                  >
                    {isChild ? `↳ ${c.name}` : c.name}
                  </Text>
                  {isSelected && <Check size={14} color={theme.colors.accentText} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Panel de Selección y Creación de Etiquetas Dinámicas */}
      {showTagSelector && (
        <View
          className="border-b px-4 py-2.5"
          style={{
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
          }}
        >
          <Text
            className="text-[10px] font-bold uppercase mb-1.5"
            style={{ color: theme.colors.textMuted }}
          >
            Etiquetas Dinámicas de la Nota:
          </Text>
          <View className="flex-row flex-wrap gap-1.5 mb-2">
            {availableTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <Pressable
                  key={tag.id}
                  onPress={() => handleToggleTagSelection(tag.id)}
                  className="px-2.5 py-1 rounded-lg flex-row items-center border"
                  style={{
                    backgroundColor: isSelected ? theme.colors.accent : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                  }}
                >
                  <View
                    className="w-1.5 h-1.5 rounded-full mr-1.5"
                    style={{ backgroundColor: isSelected ? '#FFFFFF' : tag.color }}
                  />
                  <Text
                    className="text-xs"
                    style={{
                      color: isSelected ? theme.colors.accentText : theme.colors.text,
                      fontWeight: isSelected ? '700' : '500',
                    }}
                  >
                    {tag.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Crear nuevo tag en caliente */}
          <View
            className="flex-row items-center pt-1 border-t"
            style={{ borderColor: theme.colors.border }}
          >
            <TextInput
              placeholder="Nueva etiqueta..."
              placeholderTextColor={theme.colors.textMuted}
              value={newTagInput}
              onChangeText={setNewTagInput}
              onSubmitEditing={handleCreateTag}
              returnKeyType="done"
              className="flex-1 px-2.5 py-1 rounded-lg border text-xs mr-2"
              style={{
                backgroundColor: theme.colors.inputBg,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }}
            />
            <TouchableOpacity
              onPress={handleCreateTag}
              className="px-3 py-1 rounded-lg"
              style={{ backgroundColor: theme.colors.accent }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: theme.colors.accentText }}
              >
                Agregar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 2 & 3. Arquitectura de Entrada de Texto Nativa (Mobile-First) + Prevención de Colisiones (Keyboard Handling) */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: theme.colors.background }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Título de la Nota con TextInput nativo */}
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Título del documento..."
            placeholderTextColor={theme.colors.textMuted}
            autoCorrect={true}
            spellCheck={true}
            multiline={false}
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: theme.colors.text,
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: 6,
            }}
          />

          {/* Etiquetas asignadas */}
          {renderAssignedTagBadges()}

          {/* Cuerpo de la Nota con TextInput nativo: captura pura delegada al teclado del sistema operativo */}
          <TextInput
            multiline={true}
            textAlignVertical="top"
            autoCorrect={true}
            spellCheck={true}
            value={content}
            onChangeText={setContent}
            style={{
              flex: 1,
              color: theme.colors.text,
              fontSize: 16,
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: 24,
              lineHeight: 24,
            }}
            placeholder="Escribe tu nota aquí..."
            placeholderTextColor={theme.colors.textMuted}
          />
        </ScrollView>

        {/* Barra de Estadísticas Inferior */}
        <View
          className="px-5 py-2.5 border-t flex-row items-center justify-between"
          style={{
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
          }}
        >
          <Text className="text-[11px]" style={{ color: theme.colors.textMuted }}>
            {wordCount} palabras • {charCount} caracteres
          </Text>
          {isPinned && (
            <View className="flex-row items-center">
              <Pin size={11} color="#D97706" fill="#F59E0B" />
              <Text className="text-[11px] font-semibold text-amber-500 ml-1">
                Fijada al inicio
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
