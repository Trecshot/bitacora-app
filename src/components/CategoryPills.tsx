import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Layers, Plus, Sparkles } from 'lucide-react-native';
import { NoteCategory } from '../db/database';
import { useTheme } from '../theme/ThemeContext';

interface CategoryPillsProps {
  mainCategories: NoteCategory[];
  subcategories: NoteCategory[];
  selectedMainId: string; // 'ALL' o UUID
  selectedSubId: string | null; // null (significa todas) o UUID
  onSelectMain: (id: string) => void;
  onSelectSub: (id: string | null) => void;
  onAddCategory?: () => void;
  onAddSubcategory?: (parentId: string) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  mainCategories,
  subcategories,
  selectedMainId,
  selectedSubId,
  onSelectMain,
  onSelectSub,
  onAddCategory,
  onAddSubcategory,
}) => {
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const isAllSelected = selectedMainId === 'ALL';
  const isSpecificCategorySelected = !isAllSelected && selectedMainId !== null;

  return (
    <View className="mb-3">
      {/* 1. Contenedor de Pestañas Principales (Horizontal ScrollView) */}
      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
        className="py-1"
      >
        {/* Pestaña estática inicial "Todo" */}
        <Pressable
          onPress={() => {
            onSelectMain('ALL');
            onSelectSub(null);
          }}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          className={`px-4 py-2 rounded-full mr-2 flex-row items-center border ${
            isAllSelected
              ? isDark
                ? 'bg-slate-800 border-slate-700'
                : 'bg-slate-900 border-slate-900'
              : isDark
              ? 'bg-neutral-900 border-neutral-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <View className="mr-1.5">
            <Sparkles
              size={13}
              color={isAllSelected ? '#FFFFFF' : isDark ? '#94A3B8' : '#64748B'}
            />
          </View>
          <Text
            className={`text-xs font-bold ${
              isAllSelected ? 'text-white' : isDark ? 'text-neutral-300' : 'text-slate-600'
            }`}
          >
            Todo
          </Text>
        </Pressable>

        {/* Píldoras iteradas sobre Note_Categories */}
        {mainCategories.map((cat) => {
          const isSelected = selectedMainId === cat.id;
          const subCount = cat.subcategories_count ?? 0;

          return (
            <View key={cat.id} className="mr-2">
              <Pressable
                onPress={() => {
                  onSelectMain(cat.id);
                  onSelectSub(null);
                }}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                className={`px-4 py-2 rounded-full flex-row items-center border ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600'
                    : isDark
                    ? 'bg-neutral-900 border-neutral-800'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isSelected
                      ? 'text-white'
                      : isDark
                      ? 'text-neutral-200'
                      : 'text-slate-700'
                  }`}
                >
                  {cat.name}
                </Text>
                {subCount > 0 ? (
                  <View
                    className={`ml-1.5 px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-blue-700'
                        : isDark
                        ? 'bg-neutral-800'
                        : 'bg-slate-100'
                    }`}
                  >
                    <Text
                      className={`text-[9px] font-bold ${
                        isSelected
                          ? 'text-blue-100'
                          : isDark
                          ? 'text-neutral-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {subCount}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </View>
          );
        })}

        {/* Botón para añadir nueva categoría */}
        {onAddCategory && (
          <Pressable
            onPress={onAddCategory}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className={`px-3 py-2 rounded-full border border-dashed flex-row items-center mr-4 ${
              isDark
                ? 'border-neutral-700 bg-neutral-900'
                : 'border-slate-300 bg-slate-50'
            }`}
          >
            <Plus size={13} color={isDark ? '#94A3B8' : '#64748B'} />
            <Text
              className={`text-xs ml-1 font-medium ${
                isDark ? 'text-neutral-400' : 'text-slate-500'
              }`}
            >
              Categoría
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* 2. Selector de Subcategorías (Nivel 2) */}
      {isSpecificCategorySelected && (
        <View className={`mt-2 pt-2 border-t ${isDark ? 'border-neutral-800' : 'border-slate-200'}`}>
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
            className="py-0.5"
          >
            <View className="flex-row items-center mr-2">
              <Layers size={13} color={isDark ? '#94A3B8' : '#94A3B8'} />
              <Text className={`text-[11px] font-semibold ml-1 uppercase ${isDark ? 'text-neutral-400' : 'text-slate-400'}`}>
                Subcategoría:
              </Text>
            </View>

            {/* Chip "Todas" dentro de la categoría seleccionada */}
            <Pressable
              onPress={() => onSelectSub(null)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className={`px-3 py-1 rounded-xl mr-2 border ${
                selectedSubId === null
                  ? isDark
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-slate-800 border-slate-800'
                  : isDark
                  ? 'bg-neutral-900 border-neutral-800'
                  : 'bg-slate-100 border-slate-200'
              }`}
            >
              <Text
                className={`text-[11px] font-semibold ${
                  selectedSubId === null ? 'text-white' : isDark ? 'text-neutral-300' : 'text-slate-600'
                }`}
              >
                Todas
              </Text>
            </Pressable>

            {/* 1. Subcategorías existentes */}
            {subcategories.map((sub) => {
              const isSubSelected = selectedSubId === sub.id;
              return (
                <View key={sub.id} className="mr-2">
                  <Pressable
                    onPress={() => onSelectSub(sub.id)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    className={`px-3 py-1 rounded-xl border ${
                      isSubSelected
                        ? 'bg-blue-600 border-blue-600'
                        : isDark
                        ? 'bg-neutral-900 border-neutral-800'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-medium ${
                        isSubSelected
                          ? 'text-white font-semibold'
                          : isDark
                          ? 'text-neutral-200'
                          : 'text-slate-700'
                      }`}
                    >
                      {sub.name}
                    </Text>
                  </Pressable>
                </View>
              );
            })}

            {/* 2. Botón estático "+ Subcategoría" */}
            {onAddSubcategory && (
              <Pressable
                onPress={() => onAddSubcategory(selectedMainId)}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                className={`px-2.5 py-1 rounded-xl border border-dashed flex-row items-center mr-4 ${
                  isDark
                    ? 'border-neutral-700 bg-neutral-900'
                    : 'border-slate-300 bg-slate-50'
                }`}
              >
                <Plus size={11} color={isDark ? '#94A3B8' : '#64748B'} />
                <Text className={`text-[10px] ml-1 font-semibold ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                  + Subcategoría
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};
