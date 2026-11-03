import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Search, StickyNote } from 'lucide-react-native';
import {
  getMainNoteCategories,
  getSubcategories,
  getNotes,
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

export const NotesView: React.FC = () => {
  const router = useRouter();

  // Estados de Categorías
  const [mainCategories, setMainCategories] = useState<NoteCategory[]>([]);
  const [subcategories, setSubcategories] = useState<NoteCategory[]>([]);
  const [selectedMainId, setSelectedMainId] = useState<string>('ALL'); // 'ALL' = Pestaña "Todo"
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  // Estados de Notas
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal para agregar categoría o subcategoría
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [categoryModalParentId, setCategoryModalParentId] = useState<string | null>(null);

  // Carga de datos con sincronización de SQLite
  const loadData = useCallback(() => {
    try {
      // 1. Cargar categorías principales (parent_id IS NULL)
      const mains = getMainNoteCategories();
      setMainCategories(mains);

      // 2. Si hay una categoría principal seleccionada, cargar sus subcategorías (Nivel 2)
      if (selectedMainId !== 'ALL') {
        const subs = getSubcategories(selectedMainId);
        setSubcategories(subs);
      } else {
        setSubcategories([]);
      }

      // 3. Ejecutar consulta SQL priorizando: ORDER BY is_pinned DESC, updated_at DESC
      const activeCategoryId = selectedSubId || (selectedMainId === 'ALL' ? null : selectedMainId);
      const isParentCategoryWithSubs = selectedSubId === null && selectedMainId !== 'ALL';
      const fetchedNotes = getNotes(activeCategoryId, isParentCategoryWithSubs);
      setNotes(fetchedNotes);
    } catch (e) {
      console.error('Error cargando notas y categorías:', e);
    }
  }, [selectedMainId, selectedSubId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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
      loadData();
    } catch (e) {
      console.error('Error al alternar fijado de nota:', e);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    try {
      deleteNote(noteId);
      loadData();
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
      loadData();
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

  // Filtrado de notas por término de búsqueda si se escribe en el buscador
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  const parentCategoryObj = mainCategories.find((c) => c.id === categoryModalParentId);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1">
        {/* Barra de Búsqueda Rápida de Notas */}
        <View className="px-4 pt-2 pb-1">
          <View className="flex-row items-center bg-white px-3.5 py-2.5 rounded-2xl border border-slate-200/80 shadow-sm">
            <Search size={18} color="#94A3B8" />
            <TextInput
              placeholder="Buscar en notas y apuntes..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-2 text-sm text-slate-800"
            />
          </View>
        </View>

        {/* 1 y 2. Pestañas Laterales Principales y Selector de Subcategorías */}
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

        {/* 3. Grid de Notas con numColumns={2} y priorización de fijadas */}
        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingBottom: 90, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
          }
          renderItem={({ item, index }) => (
            <View className={`w-[48%] ${index % 2 === 0 ? 'pr-1' : 'pl-1'}`}>
              <NoteCard
                note={item}
                onPress={() => router.push(`/notes/editor?id=${item.id}`)}
                onTogglePin={handleTogglePin}
                onDelete={handleDeleteNote}
              />
            </View>
          )}
          ListEmptyComponent={
            <View className="py-20 items-center px-8">
              <View className="w-16 h-16 rounded-3xl bg-slate-100 items-center justify-center mb-3">
                <StickyNote size={32} color="#94A3B8" />
              </View>
              <Text className="text-base font-semibold text-slate-700 text-center">
                No hay notas en esta vista
              </Text>
              <Text className="text-xs text-slate-400 mt-1 text-center">
                Presiona el botón (+) flotante para escribir tu primera nota en esta categoría.
              </Text>
            </View>
          }
        />

        {/* 4. Botón Flotante (FAB) anclado con sombra y elevación */}
        <FloatingActionButton
          onPress={() => {
            const targetCat =
              selectedSubId || (selectedMainId !== 'ALL' ? selectedMainId : '');
            router.push(`/notes/editor${targetCat ? `?categoryId=${targetCat}` : ''}`);
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
    </SafeAreaView>
  );
};
