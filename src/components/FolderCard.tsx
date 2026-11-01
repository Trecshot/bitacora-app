import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Folder as FolderIcon, ChevronRight, CheckSquare, Trash2 } from 'lucide-react-native';
import { Folder } from '../db/database';

interface FolderCardProps {
  folder: Folder;
  onPress: () => void;
  onDelete?: (id: number) => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({ folder, onPress, onDelete }) => {
  const accentColor = folder.color || '#3B82F6';

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-3 border border-slate-100 shadow-sm flex-row items-center justify-between"
      style={{
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center flex-1 mr-3">
        {/* Icon Container con color dinámico */}
        <View
          className="w-12 h-12 rounded-xl items-center justify-center mr-3.5"
          style={{ backgroundColor: `${accentColor}18` }}
        >
          <FolderIcon size={24} color={accentColor} />
        </View>

        {/* Textos informativos */}
        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-800" numberOfLines={1}>
            {folder.name}
          </Text>
          <View className="flex-row items-center mt-1">
            <View className="flex-row items-center mr-3">
              <CheckSquare size={13} color="#94A3B8" />
              <Text className="text-xs text-slate-500 ml-1 font-medium">
                {folder.task_count ?? 0} tareas
              </Text>
            </View>
            {(folder.subfolder_count ?? 0) > 0 && (
              <View className="flex-row items-center">
                <FolderIcon size={12} color="#94A3B8" />
                <Text className="text-xs text-slate-500 ml-1 font-medium">
                  {folder.subfolder_count} subcarpetas
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Acciones */}
      <View className="flex-row items-center space-x-1">
        {onDelete && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onDelete(folder.id);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="p-2 mr-1 rounded-lg bg-slate-50"
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        )}
        <ChevronRight size={18} color="#CBD5E1" />
      </View>
    </TouchableOpacity>
  );
};
