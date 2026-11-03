import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Pin, Trash2, Calendar } from 'lucide-react-native';
import { Note } from '../db/database';

interface NoteCardProps {
  note: Note;
  onPress: () => void;
  onTogglePin: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onPress,
  onTogglePin,
  onDelete,
}) => {
  const isPinned = note.is_pinned === 1;

  // Formato simplificado de fecha
  const formattedDate = note.updated_at
    ? note.updated_at.split(' ')[0]
    : '';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className={`rounded-2xl p-3.5 mb-3 border flex-1 ${
        isPinned
          ? 'bg-amber-50/70 border-amber-200/90 shadow-sm'
          : 'bg-white border-slate-200/80 shadow-xs'
      }`}
      style={{
        shadowColor: isPinned ? '#D97706' : '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isPinned ? 0.08 : 0.04,
        shadowRadius: 5,
        elevation: isPinned ? 2 : 1,
        minHeight: 130,
      }}
    >
      {/* Cabecera de la Tarjeta: Categoría y Botón Fijar */}
      <View className="flex-row items-center justify-between mb-2">
        {Boolean(note.category_name) ? (
          <View className="bg-slate-100 px-2 py-0.5 rounded-md max-w-[75%]">
            <Text className="text-[10px] font-semibold text-slate-600 truncate" numberOfLines={1}>
              {note.category_name}
            </Text>
          </View>
        ) : (
          <View />
        )}

        {/* Botón / Icono de Fijar */}
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={(e) => {
            e.stopPropagation();
            onTogglePin(note.id);
          }}
          className={`p-1 rounded-full ${
            isPinned ? 'bg-amber-200/60' : 'bg-transparent'
          }`}
        >
          <Pin
            size={15}
            color={isPinned ? '#D97706' : '#94A3B8'}
            fill={isPinned ? '#F59E0B' : 'none'}
          />
        </TouchableOpacity>
      </View>

      {/* Título */}
      <Text
        className="text-sm font-bold text-slate-800 mb-1.5 leading-snug"
        numberOfLines={2}
      >
        {note.title || 'Sin Título'}
      </Text>

      {/* Extracto de Contenido */}
      <Text
        className="text-xs text-slate-500 leading-relaxed flex-1"
        numberOfLines={4}
      >
        {note.content || 'Nota vacía...'}
      </Text>

      {/* Pie de Tarjeta: Fecha y Opciones */}
      <View className="flex-row items-center justify-between pt-2.5 mt-2 border-t border-slate-100">
        <View className="flex-row items-center">
          <Calendar size={11} color="#94A3B8" />
          <Text className="text-[10px] text-slate-400 ml-1 font-medium">
            {formattedDate}
          </Text>
        </View>

        {onDelete && (
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
            className="p-1"
          >
            <Trash2 size={13} color="#CBD5E1" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};
