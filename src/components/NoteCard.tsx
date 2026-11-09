import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Pin, Trash2, Calendar } from 'lucide-react-native';
import { Note } from '../db/database';
import { useTheme } from '../theme/ThemeContext';

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
  const { theme } = useTheme();
  const isPinned = note.is_pinned === 1;

  // Formato simplificado de fecha
  const formattedDate = note.updated_at ? note.updated_at.split(' ')[0] : '';
  const tags = note.tags || [];

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        theme.cardStyle,
        {
          borderRadius: theme.metrics.radii.lg,
          padding: 13,
          marginBottom: 10,
          backgroundColor: isPinned
            ? theme.colors.warningSubtle
            : theme.colors.cardBg,
          borderColor: isPinned
            ? theme.colors.warning
            : theme.colors.border,
          borderWidth: theme.metrics.borderWidth,
        },
      ]}
    >
      {/* Cabecera de la Tarjeta: Categoría y Botón Fijar */}
      <View className="flex-row items-center justify-between mb-2">
        {Boolean(note.category_name) ? (
          <View
            style={{
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.borderSubtle,
              borderWidth: 1,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: theme.metrics.radii.sm,
              maxWidth: '75%',
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '600',
                color: theme.colors.textSecondary,
              }}
              numberOfLines={1}
            >
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
          style={{
            padding: 4,
            borderRadius: theme.metrics.radii.full,
            backgroundColor: isPinned ? `${theme.colors.warning}33` : 'transparent',
          }}
        >
          <Pin
            size={14}
            color={isPinned ? theme.colors.warning : theme.colors.textMuted}
            fill={isPinned ? theme.colors.warning : 'none'}
          />
        </TouchableOpacity>
      </View>

      {/* Título */}
      <Text
        style={{
          fontSize: 14,
          fontWeight: theme.typography.titleWeight,
          color: theme.colors.text,
          marginBottom: 6,
          lineHeight: 19,
        }}
        numberOfLines={2}
      >
        {note.title || 'Sin Título'}
      </Text>

      {/* Extracto de Contenido (altura dinámica para layout asimétrico) */}
      {Boolean(note.content) && (
        <Text
          style={{
            fontSize: 12,
            color: theme.colors.textMuted,
            lineHeight: 17,
            marginBottom: 8,
          }}
          numberOfLines={6}
        >
          {note.content}
        </Text>
      )}

      {/* Taxonomía Transversal: Etiquetas Dinámicas (Tags) */}
      {tags.length > 0 && (
        <View className="flex-row flex-wrap gap-1 mb-2">
          {tags.map((tag) => (
            <View
              key={tag.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: theme.metrics.radii.sm,
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.borderSubtle,
                borderWidth: 1,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: theme.metrics.radii.full,
                  marginRight: 4,
                  backgroundColor: tag.color || theme.colors.accent,
                }}
              />
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: '500',
                  color: theme.colors.textSecondary,
                  maxWidth: 70,
                }}
                numberOfLines={1}
              >
                {tag.name}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Pie de Tarjeta: Fecha y Opciones */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 8,
          borderTopColor: theme.colors.borderSubtle,
          borderTopWidth: 1,
          marginTop: 'auto',
        }}
      >
        <View className="flex-row items-center">
          <Calendar size={11} color={theme.colors.textMuted} />
          <Text
            style={{
              fontSize: 10,
              color: theme.colors.textMuted,
              marginLeft: 4,
              fontWeight: '500',
            }}
          >
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
            style={{ padding: 4 }}
          >
            <Trash2 size={13} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};
