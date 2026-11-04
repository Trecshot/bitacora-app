import React, { useState } from 'react';
import { View, Text, TextInput, Modal, TouchableOpacity } from 'react-native';
import { X, FolderPlus, GitBranch } from 'lucide-react-native';

interface CreateFolderModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, color: string, description?: string) => void;
  /** Color hexadecimal heredado automáticamente del nodo padre (Herencia Visual) */
  defaultColor?: string;
  /** Nombre de la carpeta padre cuando se crea una subcarpeta */
  parentFolderName?: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  visible,
  onClose,
  onSubmit,
  defaultColor,
  parentFolderName,
}) => {
  const inheritedColor = defaultColor || COLORS[0];
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customColor, setCustomColor] = useState<string | null>(null);

  const selectedColor = customColor || inheritedColor;

  // Asegurar que el color heredado aparezca en la paleta si fuera personalizado
  const colorPalette = COLORS.includes(inheritedColor)
    ? COLORS
    : [inheritedColor, ...COLORS.slice(0, 5)];

  const handleClose = () => {
    setName('');
    setDescription('');
    setCustomColor(null);
    onClose();
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    onSubmit(name.trim(), selectedColor, description.trim());
    setName('');
    setDescription('');
    setCustomColor(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 bg-black/40 justify-center items-center px-4">
        <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1 mr-2">
              <View
                className="w-8 h-8 rounded-lg items-center justify-center mr-2"
                style={{ backgroundColor: `${selectedColor}18` }}
              >
                <FolderPlus size={18} color={selectedColor} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-slate-800">
                  {parentFolderName ? 'Nueva Subcarpeta' : 'Nueva Carpeta'}
                </Text>
                {Boolean(parentFolderName) && (
                  <View className="flex-row items-center mt-0.5">
                    <GitBranch size={11} color="#64748B" />
                    <Text className="text-[11px] text-slate-500 ml-1" numberOfLines={1}>
                      Dentro de {parentFolderName}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} className="p-1">
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
            className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 bg-slate-50 mb-3"
          />

          <Text className="text-xs font-semibold text-slate-600 mb-1">
            Contexto o idea (opcional)
          </Text>
          <TextInput
            placeholder="Breve resumen o notas clave (Markdown)..."
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 bg-slate-50 mb-4"
          />

          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-semibold text-slate-600">Color del identificador</Text>
            {Boolean(defaultColor) && (
              <TouchableOpacity
                onPress={() => setCustomColor(null)}
                className="flex-row items-center bg-slate-100 px-2 py-0.5 rounded-full"
              >
                <View
                  className="w-2.5 h-2.5 rounded-full mr-1.5"
                  style={{ backgroundColor: inheritedColor }}
                />
                <Text className="text-[10px] font-semibold text-slate-600">
                  {selectedColor === inheritedColor
                    ? 'Heredado del padre'
                    : 'Restaurar color padre'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="flex-row justify-between mb-6">
            {colorPalette.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setCustomColor(c)}
                style={{ backgroundColor: c }}
                className={`w-9 h-9 rounded-full items-center justify-center ${
                  selectedColor === c ? 'border-2 border-slate-800' : ''
                }`}
              />
            ))}
          </View>

          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={handleClose}
              className="flex-1 py-3 rounded-xl bg-slate-100 items-center mr-2"
            >
              <Text className="text-sm font-semibold text-slate-600">Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreate}
              style={{ backgroundColor: selectedColor }}
              className="flex-1 py-3 rounded-xl items-center ml-2"
            >
              <Text className="text-sm font-semibold text-white">Crear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
