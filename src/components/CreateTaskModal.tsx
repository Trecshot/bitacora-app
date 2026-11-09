import React, { useState } from 'react';
import { View, Text, TextInput, Modal, TouchableOpacity } from 'react-native';
import { X, PlusCircle, Calendar } from 'lucide-react-native';
import { TaskPriority, TaskStatus } from '../db/database';
import { formatDateOnlyOffset } from '../utils/dateAndTaskUtils';
import { useTheme } from '../theme/ThemeContext';

interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (
    title: string,
    description: string,
    priority: TaskPriority,
    status: TaskStatus,
    dueDate: string | null
  ) => void;
  defaultStatus?: TaskStatus;
}

const PRIORITIES: { label: string; value: TaskPriority }[] = [
  { label: 'Baja', value: 'LOW' },
  { label: 'Media', value: 'MEDIUM' },
  { label: 'Alta', value: 'HIGH' },
];

type DuePreset = 'NONE' | 'TODAY' | 'TOMORROW' | 'NEXT_WEEK';

const DUE_PRESETS: { id: DuePreset; label: string }[] = [
  { id: 'NONE', label: 'Sin fecha' },
  { id: 'TODAY', label: 'Hoy' },
  { id: 'TOMORROW', label: 'Mañana' },
  { id: 'NEXT_WEEK', label: '+7 días' },
];

function computeDateFromPreset(preset: DuePreset): string | null {
  if (preset === 'NONE') return null;
  const days = preset === 'TODAY' ? 0 : preset === 'TOMORROW' ? 1 : 7;
  return formatDateOnlyOffset(days);
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  visible,
  onClose,
  onSubmit,
  defaultStatus = 'TODO',
}) => {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [duePreset, setDuePreset] = useState<DuePreset>('NONE');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setDuePreset('NONE');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = () => {
    if (!title.trim()) return;
    const dueDate = computeDateFromPreset(duePreset);
    onSubmit(title.trim(), description.trim(), priority, defaultStatus, dueDate);
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 bg-black/60 justify-center items-center px-4">
        <View style={[theme.cardStyle, { width: '100%', maxWidth: 380, padding: 24 }]}>
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View
                className="w-8 h-8 rounded-lg items-center justify-center mr-2"
                style={{ backgroundColor: `${theme.colors.success}18` }}
              >
                <PlusCircle size={18} color={theme.colors.success} />
              </View>
              <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                Nueva Tarea
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} className="p-1">
              <X size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text
            className="text-xs font-semibold mb-1"
            style={{ color: theme.colors.textSecondary }}
          >
            Título de la tarea
          </Text>
          <TextInput
            placeholder="Ej: Implementar triggers SQLite..."
            placeholderTextColor={theme.colors.textMuted}
            value={title}
            onChangeText={setTitle}
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
            Descripción (opcional)
          </Text>
          <TextInput
            placeholder="Detalles técnicos o requisitos..."
            placeholderTextColor={theme.colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="border rounded-xl px-3.5 py-2.5 text-sm mb-3 h-20"
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
            Prioridad
          </Text>
          <View className="flex-row mb-4">
            {PRIORITIES.map((p) => {
              const isSelected = priority === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => setPriority(p.value)}
                  className="flex-1 py-2 rounded-xl items-center border mx-1"
                  style={{
                    backgroundColor: isSelected
                      ? theme.colors.accent
                      : theme.colors.surfaceElevated,
                    borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color: isSelected
                        ? theme.colors.accentText
                        : theme.colors.textSecondary,
                    }}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="flex-row items-center mb-1.5">
            <Calendar size={13} color={theme.colors.textMuted} />
            <Text
              className="text-xs font-semibold ml-1"
              style={{ color: theme.colors.textSecondary }}
            >
              Fecha límite (opcional)
            </Text>
          </View>
          <View className="flex-row flex-wrap mb-5">
            {DUE_PRESETS.map((opt) => {
              const isSelected = duePreset === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setDuePreset(opt.id)}
                  className="px-3 py-1.5 rounded-xl border mr-1.5 mb-1.5"
                  style={{
                    backgroundColor: isSelected
                      ? theme.colors.accent
                      : theme.colors.surfaceElevated,
                    borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color: isSelected
                        ? theme.colors.accentText
                        : theme.colors.textSecondary,
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
              className="flex-1 py-3 rounded-xl items-center ml-2"
              style={{ backgroundColor: theme.colors.success }}
            >
              <Text className="text-sm font-semibold text-white">Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
