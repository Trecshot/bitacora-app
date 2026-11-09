import React, { useState } from 'react';
import { View, Text, TextInput, Modal, Pressable } from 'react-native';
import { X, FolderPlus } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

interface CreateCategoryModalProps {
  visible: boolean;
  parentId: string | null;
  parentName?: string;
  onClose: () => void;
  onSubmit: (name: string, parentId: string | null) => void;
}

export const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  visible,
  parentId,
  parentName,
  onClose,
  onSubmit,
}) => {
  const { theme } = useTheme();
  const [name, setName] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    onSubmit(name.trim(), parentId);
    setName('');
    onClose();
  };

  const isSubcategory = parentId !== null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center px-4">
        <View style={[theme.cardStyle, { width: '100%', maxWidth: 380, padding: 24 }]}>
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View
                className="w-8 h-8 rounded-lg items-center justify-center mr-2"
                style={{ backgroundColor: `${theme.colors.accent}15` }}
              >
                <FolderPlus size={18} color={theme.colors.accent} />
              </View>
              <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                {isSubcategory ? 'Nueva Subcategoría' : 'Nueva Categoría'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              className="p-1"
            >
              <X size={20} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          {isSubcategory && Boolean(parentName) && (
            <View
              className="p-2.5 rounded-xl mb-3 border"
              style={{
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              }}
            >
              <Text className="text-xs" style={{ color: theme.colors.textMuted }}>
                Categoría Principal:{' '}
                <Text className="font-semibold" style={{ color: theme.colors.text }}>
                  {parentName}
                </Text>
              </Text>
            </View>
          )}

          <Text
            className="text-xs font-semibold mb-1"
            style={{ color: theme.colors.textSecondary }}
          >
            Nombre de la {isSubcategory ? 'subcategoría' : 'categoría'}
          </Text>
          <TextInput
            placeholder={
              isSubcategory
                ? 'Ej: Series Animadas, En emisión...'
                : 'Ej: Videojuegos, Películas, Libros...'
            }
            placeholderTextColor={theme.colors.textMuted}
            value={name}
            onChangeText={setName}
            onSubmitEditing={handleCreate}
            returnKeyType="done"
            autoFocus
            className="border rounded-xl px-3.5 py-2.5 text-sm mb-5"
            style={{
              backgroundColor: theme.colors.inputBg,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }}
          />

          <View className="flex-row">
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                },
              ]}
              className="flex-1 py-3 rounded-xl items-center mr-2"
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: theme.colors.textSecondary }}
              >
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              onPress={handleCreate}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: theme.colors.accent,
                },
              ]}
              className="flex-1 py-3 rounded-xl items-center ml-2"
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: theme.colors.accentText }}
              >
                Crear
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
