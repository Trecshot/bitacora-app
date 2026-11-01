import React, { useState } from 'react';
import { View, Text, TextInput, Modal, TouchableOpacity } from 'react-native';
import { X, FolderPlus } from 'lucide-react-native';

interface CreateFolderModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, color: string) => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const handleCreate = () => {
    if (!name.trim()) return;
    onSubmit(name.trim(), selectedColor);
    setName('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-center items-center px-4">
        <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-blue-50 items-center justify-center mr-2">
                <FolderPlus size={18} color="#2563EB" />
              </View>
              <Text className="text-lg font-bold text-slate-800">Nueva Carpeta</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text className="text-xs font-semibold text-slate-600 mb-1">Nombre de la carpeta</Text>
          <TextInput
            placeholder="Ej: Sprint 4, Arquitectura..."
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
            autoFocus
            className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 bg-slate-50 mb-4"
          />

          <Text className="text-xs font-semibold text-slate-600 mb-2">Color del identificador</Text>
          <View className="flex-row justify-between mb-6">
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setSelectedColor(c)}
                style={{ backgroundColor: c }}
                className={`w-9 h-9 rounded-full items-center justify-center ${
                  selectedColor === c ? 'border-2 border-slate-800' : ''
                }`}
              />
            ))}
          </View>

          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-100 items-center mr-2"
            >
              <Text className="text-sm font-semibold text-slate-600">Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreate}
              className="flex-1 py-3 rounded-xl bg-blue-600 items-center ml-2"
            >
              <Text className="text-sm font-semibold text-white">Crear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
