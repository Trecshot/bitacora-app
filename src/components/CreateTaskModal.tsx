import React, { useState } from 'react';
import { View, Text, TextInput, Modal, TouchableOpacity } from 'react-native';
import { X, PlusCircle } from 'lucide-react-native';
import { TaskPriority, TaskStatus } from '../db/database';

interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string, priority: TaskPriority, status: TaskStatus) => void;
  defaultStatus?: TaskStatus;
}

const PRIORITIES: { label: string; value: TaskPriority }[] = [
  { label: 'Baja', value: 'LOW' },
  { label: 'Media', value: 'MEDIUM' },
  { label: 'Alta', value: 'HIGH' },
];

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  visible,
  onClose,
  onSubmit,
  defaultStatus = 'TODO',
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');

  const handleCreate = () => {
    if (!title.trim()) return;
    onSubmit(title.trim(), description.trim(), priority, defaultStatus);
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-center items-center px-4">
        <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-emerald-50 items-center justify-center mr-2">
                <PlusCircle size={18} color="#059669" />
              </View>
              <Text className="text-lg font-bold text-slate-800">Nueva Tarea</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text className="text-xs font-semibold text-slate-600 mb-1">Título de la tarea</Text>
          <TextInput
            placeholder="Ej: Implementar triggers SQLite..."
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={setTitle}
            autoFocus
            className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 bg-slate-50 mb-3"
          />

          <Text className="text-xs font-semibold text-slate-600 mb-1">Descripción (opcional)</Text>
          <TextInput
            placeholder="Detalles técnicos o requisitos..."
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 bg-slate-50 mb-3 h-20 text-top"
          />

          <Text className="text-xs font-semibold text-slate-600 mb-1">Prioridad</Text>
          <View className="flex-row space-x-2 mb-6">
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p.value}
                onPress={() => setPriority(p.value)}
                className={`flex-1 py-2 rounded-xl items-center border mx-1 ${
                  priority === p.value
                    ? 'bg-slate-800 border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    priority === p.value ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
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
              className="flex-1 py-3 rounded-xl bg-emerald-600 items-center ml-2"
            >
              <Text className="text-sm font-semibold text-white">Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
