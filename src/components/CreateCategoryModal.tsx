import React, { useState } from 'react';
import { View, Text, TextInput, Modal, Pressable } from 'react-native';
import { X, FolderPlus } from 'lucide-react-native';

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
      <View className="flex-1 bg-black/40 justify-center items-center px-4">
        <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-blue-50 items-center justify-center mr-2">
                <FolderPlus size={18} color="#2563EB" />
              </View>
              <Text className="text-lg font-bold text-slate-800">
                {isSubcategory ? 'Nueva Subcategoría' : 'Nueva Categoría'}
              </Text>
            </View>
            <Pressable onPress={onClose} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} className="p-1">
              <X size={20} color="#94A3B8" />
            </Pressable>
          </View>

          {isSubcategory && Boolean(parentName) && (
            <View className="bg-slate-100 p-2.5 rounded-xl mb-3">
              <Text className="text-xs text-slate-500">
                Categoría Principal: <Text className="font-semibold text-slate-700">{parentName}</Text>
              </Text>
            </View>
          )}

          <Text className="text-xs font-semibold text-slate-600 mb-1">
            Nombre de la {isSubcategory ? 'subcategoría' : 'categoría'}
          </Text>
          <TextInput
            placeholder={isSubcategory ? "Ej: Series Animadas, En emisión..." : "Ej: Videojuegos, Películas, Libros..."}
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
            onSubmitEditing={handleCreate}
            returnKeyType="done"
            autoFocus
            className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 bg-slate-50 mb-5"
          />

          <View className="flex-row space-x-3">
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="flex-1 py-3 rounded-xl bg-slate-100 items-center mr-2"
            >
              <Text className="text-sm font-semibold text-slate-600">Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={handleCreate}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="flex-1 py-3 rounded-xl bg-blue-600 items-center ml-2"
            >
              <Text className="text-sm font-semibold text-white">Crear</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
