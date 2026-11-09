import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Search, FileText, X, Zap } from 'lucide-react-native';
import { FlashList, FlashListProps } from '@shopify/flash-list';
import {
  getMainNoteCategories,
  getSubcategories,
  getNotes,
  searchNotes,
  createNoteCategory,
  toggleNotePinned,
  deleteNote,
  NoteCategory,
  Note,
} from '../db/database';
import { CategoryPills } from './CategoryPills';
import { NoteCard } from './NoteCard';
import { FloatingActionButton } from './FloatingActionButton';
import { CreateCategoryModal } from './CreateCategoryModal';
import { useTheme } from '../theme/ThemeContext';

/**
 * Componente MasonryFlashList (Shopify)
 * Activa la virtualización asimétrica de alto rendimiento en dos columnas con cálculo de
 * pre-renderizado fuera de pantalla para mantener 60 FPS estables.
 */
export const MasonryFlashList = <T,>(props: FlashListProps<T>) => (
  <FlashList masonry={true} optimizeItemArrangement={true} {...props} />
);

export const NotesView: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();

  // Estados de Categorías (Jerarquía)
  const [selectedMainId, setSelectedMainId] = useState<string>('ALL'); // 'ALL' = Pestaña "Todo"
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  // Estados de Búsqueda FTS5 & Refresco
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal para agregar categoría o subcategoría
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [categoryModalParentId, setCategoryModalParentId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  // Derivación de Categorías Principales sincronizadas con SQLite
  const mainCategories = useMemo<NoteCategory[]>(() => {
    void refreshTrigger;
    try {
      return getMainNoteCategories();
    } catch (e) {
      console.error('Error cargando categorías principales:', e);
      return [];
    }
  }, [refreshTrigger]);

  // Derivación de Subcategorías (Nivel 2)
  const subcategories = useMemo<NoteCategory[]>(() => {
    void refreshTrigger;
    if (selectedMainId === 'ALL') return [];
    try {
      return getSubcategories(selectedMainId);
    } catch (e) {
      console.error('Error cargando subcategorías:', e);
      return [];
    }
  }, [selectedMainId, refreshTrigger]);

  // Derivación de Notas con Motor FTS5 MATCH o recuperación transversal SQLite
  const notes = useMemo<Note[]>(() => {
    void refreshTrigger;
    const activeCategoryId = selectedSubId || (selectedMainId === 'ALL' ? null : selectedMainId);
    const isParentCategoryWithSubs = selectedSubId === null && selectedMainId !== 'ALL';

    try {
      if (searchQuery.trim()) {
        return searchNotes(searchQuery, {
          categoryId: activeCategoryId,
          tagId: null,
          isMainCategoryWithSubs: isParentCategoryWithSubs,
        });
      }
      return getNotes(activeCategoryId, isParentCategoryWithSubs, null);
    } catch (e) {
      console.error('Error recuperando notas con FTS5:', e);
      return [];
    }
  }, [selectedMainId, selectedSubId, searchQuery, refreshTrigger]);

  const onRefresh = () => {
    setRefreshing(true);
    reload();
    setRefreshing(false);
  };

  const handleSelectMainCategory = (id: string) => {
    setSelectedMainId(id);
    setSelectedSubId(null);
  };

  const handleSelectSubcategory = (id: string | null) => {
    setSelectedSubId(id);
  };

  const handleTogglePin = (noteId: string) => {
    try {
      toggleNotePinned(noteId);
      reload();
    } catch (e) {
      console.error('Error al alternar fijado de nota:', e);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    try {
      deleteNote(noteId);
      reload();
    } catch (e) {
      console.error('Error al eliminar nota:', e);
    }
  };

  const handleCreateCategorySubmit = (name: string, parentId: string | null) => {
    try {
      const newId = createNoteCategory(name, parentId);
      if (parentId) {
        setSelectedSubId(newId);
      }
      reload();
    } catch (e) {
      console.error('Error al crear categoría:', e);
    }
  };

  const handleOpenAddCategory = () => {
    setCategoryModalParentId(null);
    setIsCategoryModalVisible(true);
  };

  const handleOpenAddSubcategory = (parentId: string) => {
    setCategoryModalParentId(parentId);
    setIsCategoryModalVisible(true);
  };

  const parentCategoryObj = mainCategories.find((c) => c.id === categoryModalParentId);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      {/* Barra de Búsqueda Rápida de Notas (Indexada con SQLite FTS5 MATCH) */}
      <View className="px-4 pt-2 pb-1">
        <View
          className="flex-row items-center px-3.5 py-2.5 rounded-2xl border"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          }}
        >
          <Search
            size={18}
            color={searchQuery.trim() ? theme.colors.accent : theme.colors.textMuted}
          />
          <TextInput
            placeholder="Buscar en notas y apuntes..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            className="flex-1 ml-2 text-sm"
            style={{ color: theme.colors.text }}
          />
          {Boolean(searchQuery.trim()) && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              className="p-1 rounded-full"
              style={{ backgroundColor: theme.colors.surfaceElevated }}
            >
              <X size={14} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Indicador de Búsqueda FTS5 activa */}
      {Boolean(searchQuery.trim()) && (
        <View className="px-4 py-1.5 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Zap size={13} color={theme.colors.accent} />
            <Text
              className="text-[11px] font-semibold ml-1.5"
              style={{ color: theme.colors.accent }}
            >
              Búsqueda FTS5 (MATCH): {notes.length} resultado{notes.length === 1 ? '' : 's'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text className="text-[11px] font-medium" style={{ color: theme.colors.textMuted }}>
              Limpiar
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 1. Categorías Principales y Subcategorías (Jerarquía) */}
      <CategoryPills
        mainCategories={mainCategories}
        subcategories={subcategories}
        selectedMainId={selectedMainId}
        selectedSubId={selectedSubId}
        onSelectMain={handleSelectMainCategory}
        onSelectSub={handleSelectSubcategory}
        onAddCategory={handleOpenAddCategory}
        onAddSubcategory={handleOpenAddSubcategory}
      />

      {/* 2. Virtualización Asimétrica con MasonryFlashList (Shopify) */}
      <View className="flex-1 px-1">
        <MasonryFlashList
          data={notes}
          numColumns={2}
          keyExtractor={(item: Note) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 95, paddingTop: 2 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.accent]}
              tintColor={theme.colors.accent}
            />
          }
          renderItem={({ item }: { item: Note }) => (
            <View className="px-1.5 pb-2">
              <NoteCard
                note={item}
                onPress={() => router.push(`/notes/editor?id=${item.id}`)}
                onTogglePin={handleTogglePin}
                onDelete={handleDeleteNote}
              />
            </View>
          )}
          ListEmptyComponent={
            <View className="py-24 items-center px-8">
              <View
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 18,
                  backgroundColor: theme.isDark ? theme.colors.surfaceElevated : '#EFF6FF',
                  borderColor: theme.isDark ? theme.colors.border : '#DBEAFE',
                  borderWidth: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <FileText
                  size={28}
                  color={theme.isDark ? theme.colors.textMuted : '#3B82F6'}
                  strokeWidth={1.8}
                />
              </View>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '700',
                  color: theme.colors.text,
                  textAlign: 'center',
                  marginBottom: 6,
                }}
              >
                {Boolean(searchQuery.trim())
                  ? 'No se encontraron notas con esa búsqueda'
                  : 'No hay notas en esta vista'}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: theme.colors.textMuted,
                  textAlign: 'center',
                  lineHeight: 18,
                  maxWidth: 270,
                }}
              >
                {Boolean(searchQuery.trim())
                  ? 'El motor de búsqueda no encontró coincidencias en el título o contenido.'
                  : 'Presiona el botón (+) flotante para escribir tu primera nota en esta categoría.'}
              </Text>
            </View>
          }
        />
      </View>

      {/* 3. Botón Flotante (FAB) anclado con sombra y elevación */}
      <FloatingActionButton
        onPress={() => {
          const targetCat =
            selectedSubId || (selectedMainId !== 'ALL' ? selectedMainId : '');
          router.push(
            `/notes/editor${targetCat ? `?categoryId=${targetCat}` : ''}`
          );
        }}
      />

      {/* Modal de Creación de Categoría / Subcategoría */}
      <CreateCategoryModal
        visible={isCategoryModalVisible}
        parentId={categoryModalParentId}
        parentName={parentCategoryObj?.name}
        onClose={() => setIsCategoryModalVisible(false)}
        onSubmit={handleCreateCategorySubmit}
      />
    </View>
  );
};
