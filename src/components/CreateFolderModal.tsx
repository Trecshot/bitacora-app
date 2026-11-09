import React, { useState } from 'react';
import { View, Text, TextInput, Modal, TouchableOpacity } from 'react-native';
import { X, FolderPlus, GitBranch } from 'lucide-react-native';
import { FOLDER_COLORS } from '../utils/dateAndTaskUtils';
import { useTheme } from '../theme/ThemeContext';

interface CreateFolderModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, color: string, description?: string) => void;
  /** Color hexadecimal heredado automáticamente del nodo padre (Herencia Visual) */
  defaultColor?: string;
  /** Nombre de la carpeta padre cuando se crea una subcarpeta */
  parentFolderName?: string;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  visible,
  onClose,
  onSubmit,
  defaultColor,
  parentFolderName,
}) => {
  const { theme } = useTheme();
  const inheritedColor = defaultColor || FOLDER_COLORS[0];
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customColor, setCustomColor] = useState<string | null>(null);

  const selectedColor = customColor || inheritedColor;

  // Asegurar que el color heredado aparezca en la paleta si fuera personalizado
  const colorPalette: readonly string[] = (FOLDER_COLORS as readonly string[]).includes(
    inheritedColor
  )
    ? FOLDER_COLORS
    : [inheritedColor, ...FOLDER_COLORS.slice(0, 5)];

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
      <View className="flex-1 bg-black/60 justify-center items-center px-4">
        <View style={[theme.cardStyle, { width: '100%', maxWidth: 380, padding: 24 }]}>
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1 mr-2">
              <View
                className="w-8 h-8 rounded-lg items-center justify-center mr-2"
                style={{ backgroundColor: `${selectedColor}18` }}
              >
                <FolderPlus size={18} color={selectedColor} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                  {parentFolderName ? 'Nueva Subcarpeta' : 'Nueva Carpeta'}
                </Text>
                {Boolean(parentFolderName) && (
                  <View className="flex-row items-center mt-0.5">
                    <GitBranch size={11} color={theme.colors.textMuted} />
                    <Text
                      className="text-[11px] ml-1"
                      style={{ color: theme.colors.textMuted }}
                      numberOfLines={1}
                    >
                      Dentro de {parentFolderName}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} className="p-1">
              <X size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text
            className="text-xs font-semibold mb-1"
            style={{ color: theme.colors.textSecondary }}
          >
            Nombre de la carpeta
          </Text>
          <TextInput
            placeholder="Ej: Sprint 4, Arquitectura..."
            placeholderTextColor={theme.colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
            className="border rounded-xl px-3.5 py-2.5 text-sm mb-3"
            style={{
              backgroundColor: theme.colors.inputBg,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }}
          />

          <Text
            className="text-xs font-semibold mb-1"
            style={{ color: theme.colors.textSecondary }}
          >
            Contexto o idea (opcional)
          </Text>
          <TextInput
            placeholder="Breve resumen o notas clave (Markdown)..."
            placeholderTextColor={theme.colors.textMuted}
            value={description}
            onChangeText={setDescription}
            className="border rounded-xl px-3.5 py-2 text-sm mb-4"
            style={{
              backgroundColor: theme.colors.inputBg,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }}
          />

          <View className="flex-row items-center justify-between mb-2">
            <Text
              className="text-xs font-semibold"
              style={{ color: theme.colors.textSecondary }}
            >
              Color del identificador
            </Text>
            {Boolean(defaultColor) && (
              <TouchableOpacity
                onPress={() => setCustomColor(null)}
                className="flex-row items-center px-2 py-0.5 rounded-full border"
                style={{
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                }}
              >
                <View
                  className="w-2.5 h-2.5 rounded-full mr-1.5"
                  style={{ backgroundColor: inheritedColor }}
                />
                <Text
                  className="text-[10px] font-semibold"
                  style={{ color: theme.colors.textSecondary }}
                >
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
                style={{
                  backgroundColor: c,
                  borderColor: selectedColor === c ? theme.colors.text : 'transparent',
                }}
                className={`w-9 h-9 rounded-full items-center justify-center ${
                  selectedColor === c ? 'border-2' : ''
                }`}
              />
            ))}
          </View>

          <View className="flex-row">
            <TouchableOpacity
              onPress={handleClose}
              className="flex-1 py-3 rounded-xl items-center mr-2 border"
              style={{
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: theme.colors.textSecondary }}
              >
                Cancelar
              </Text>
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
