import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  ArrowLeft,
  Pin,
  Check,
  Trash2,
  Tag,
  Clock,
} from 'lucide-react-native';
import {
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  getAllNoteCategories,
  NoteCategory,
} from '../../src/db/database';

export default function NoteEditorScreen() {
  const router = useRouter();
  const { id, categoryId: initialCategoryId } = useLocalSearchParams<{
    id?: string;
    categoryId?: string;
  }>();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<NoteCategory[]>([]);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Cargar categorías y nota existente si aplica
  useEffect(() => {
    try {
      const allCats = getAllNoteCategories();
      setCategories(allCats);

      if (id) {
        const existingNote = getNoteById(id);
        if (existingNote) {
          setTitle(existingNote.title);
          setContent(existingNote.content);
          setIsPinned(existingNote.is_pinned === 1);
          setSelectedCategoryId(existingNote.category_id);
          setLastSaved(existingNote.updated_at || null);
        }
      } else {
        // Nueva nota
        if (initialCategoryId && initialCategoryId !== 'ALL') {
          setSelectedCategoryId(initialCategoryId);
        } else if (allCats.length > 0) {
          setSelectedCategoryId(allCats[0].id);
        }
      }
    } catch (e) {
      console.error('Error cargando datos en editor de notas:', e);
    }
  }, [id, initialCategoryId]);

  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
      Alert.alert('Nota vacía', 'Por favor ingresa al menos un título o contenido.');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('Categoría requerida', 'Por favor selecciona una categoría para la nota.');
      return;
    }

    setIsSaving(true);
    try {
      if (id) {
        updateNote(
          id,
          title.trim() || 'Sin Título',
          content,
          selectedCategoryId,
          isPinned
        );
      } else {
        createNote(
          selectedCategoryId,
          title.trim() || 'Sin Título',
          content,
          isPinned
        );
      }
      router.back();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la nota.');
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert('Eliminar Nota', '¿Estás seguro de que deseas eliminar esta nota permanentemente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          try {
            deleteNote(id);
            router.back();
          } catch (e) {
            Alert.alert('Error', 'No se pudo eliminar la nota.');
          }
        },
      },
    ]);
  };

  const currentCategoryName =
    categories.find((c) => c.id === selectedCategoryId)?.name || 'Seleccionar categoría';

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Barra Superior Personalizada */}
        <View className="px-4 py-3 flex-row items-center justify-between border-b border-slate-100 bg-white">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-2"
          >
            <ArrowLeft size={20} color="#334155" />
          </TouchableOpacity>

          <View className="flex-row items-center space-x-2">
            {/* Botón Fijar Nota */}
            <TouchableOpacity
              onPress={() => setIsPinned(!isPinned)}
              activeOpacity={0.7}
              className={`p-2 rounded-full border mr-1 ${
                isPinned
                  ? 'bg-amber-100 border-amber-300'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <Pin
                size={18}
                color={isPinned ? '#D97706' : '#94A3B8'}
                fill={isPinned ? '#F59E0B' : 'none'}
              />
            </TouchableOpacity>

            {/* Botón Eliminar (solo en notas existentes) */}
            {Boolean(id) && (
              <TouchableOpacity
                onPress={handleDelete}
                className="p-2 rounded-full bg-rose-50 border border-rose-200 mr-1"
              >
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
            )}

            {/* Botón Guardar */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              className="flex-row items-center bg-blue-600 px-4 py-2 rounded-full shadow-sm"
            >
              <Check size={16} color="#FFFFFF" />
              <Text className="text-white font-bold text-xs ml-1.5">
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Selector de Categoría Rápido */}
        <View className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => setShowCategorySelector(!showCategorySelector)}
            className="flex-row items-center bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs"
          >
            <Tag size={13} color="#2563EB" />
            <Text className="text-xs font-semibold text-slate-700 ml-1.5">
              {currentCategoryName}
            </Text>
          </TouchableOpacity>

          {Boolean(lastSaved) && (
            <View className="flex-row items-center">
              <Clock size={11} color="#94A3B8" />
              <Text className="text-[10px] text-slate-400 ml-1">
                Editado {lastSaved?.split(' ')[1]}
              </Text>
            </View>
          )}
        </View>

        {/* Dropdown / Lista desplegable de Categorías */}
        {showCategorySelector && (
          <View className="bg-slate-100 border-b border-slate-200 max-h-48 px-4 py-2">
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
                    className={`py-2 px-3 rounded-lg mb-1 flex-row items-center justify-between ${
                      isSelected ? 'bg-blue-600' : 'bg-white'
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        isChild ? 'pl-3' : 'font-semibold'
                      } ${isSelected ? 'text-white font-bold' : 'text-slate-700'}`}
                    >
                      {isChild ? `↳ ${c.name}` : c.name}
                    </Text>
                    {isSelected && <Check size={14} color="#FFFFFF" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Lienzo de Edición de Nota */}
        <ScrollView
          className="flex-1 px-5 pt-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Título de la Nota */}
          <TextInput
            placeholder="Título de la nota..."
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={setTitle}
            className="text-2xl font-bold text-slate-900 mb-3"
            multiline={false}
          />

          {/* Cuerpo del Texto Enriquecido o Plano */}
          <TextInput
            placeholder="Comienza a escribir aquí tu contenido..."
            placeholderTextColor="#CBD5E1"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            className="text-base text-slate-700 leading-relaxed min-h-[350px]"
          />
        </ScrollView>

        {/* Barra de Estadísticas Inferior */}
        <View className="px-5 py-2 border-t border-slate-100 flex-row items-center justify-between bg-slate-50/60">
          <Text className="text-[11px] text-slate-400">
            {wordCount} palabras • {charCount} caracteres
          </Text>
          {isPinned && (
            <View className="flex-row items-center">
              <Pin size={11} color="#D97706" fill="#F59E0B" />
              <Text className="text-[11px] font-semibold text-amber-600 ml-1">Fijada al inicio</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
