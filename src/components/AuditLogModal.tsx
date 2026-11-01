import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, History, Sparkles } from 'lucide-react-native';
import { AuditLog } from '../db/database';

interface AuditLogModalProps {
  visible: boolean;
  onClose: () => void;
  logs: AuditLog[];
  onRefresh: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  visible,
  onClose,
  logs,
  onRefresh,
}) => {
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return { label: 'INSERT', bg: 'bg-emerald-100 text-emerald-800' };
      case 'STATUS_CHANGE':
        return { label: 'STATUS TRIGGER', bg: 'bg-blue-100 text-blue-800' };
      case 'UPDATE':
        return { label: 'UPDATE', bg: 'bg-amber-100 text-amber-800' };
      case 'DELETE':
        return { label: 'DELETE', bg: 'bg-rose-100 text-rose-800' };
      default:
        return { label: action, bg: 'bg-slate-100 text-slate-800' };
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-6 h-[80%] shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-slate-100">
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-xl bg-purple-50 items-center justify-center mr-2.5">
                <History size={20} color="#7C3AED" />
              </View>
              <View>
                <Text className="text-lg font-bold text-slate-800">Historial de Auditoría</Text>
                <View className="flex-row items-center">
                  <Sparkles size={11} color="#10B981" />
                  <Text className="text-xs text-slate-500 ml-1">
                    Generado automáticamente por Triggers SQLite
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2">
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Lista de Registros de Auditoría */}
          <ScrollView className="flex-1 mt-4" showsVerticalScrollIndicator={false}>
            {logs.length === 0 ? (
              <View className="py-12 items-center">
                <Text className="text-sm text-slate-400">No hay registros de auditoría aún.</Text>
              </View>
            ) : (
              logs.map((log) => {
                const badge = getActionBadge(log.action);
                return (
                  <View
                    key={log.id}
                    className="p-3.5 mb-2.5 rounded-2xl bg-slate-50 border border-slate-200/80"
                  >
                    <View className="flex-row items-center justify-between mb-1.5">
                      <View className="flex-row items-center space-x-2">
                        <View className={`px-2 py-0.5 rounded-md ${badge.bg}`}>
                          <Text className="text-[10px] font-bold tracking-wider">{badge.label}</Text>
                        </View>
                        <Text className="text-xs font-semibold text-slate-700 ml-2">
                          {log.entity_type} #{log.entity_id}
                        </Text>
                      </View>
                      <Text className="text-[10px] text-slate-400">{log.timestamp}</Text>
                    </View>

                    {Boolean(log.old_value) && (
                      <View className="mt-1">
                        <Text className="text-[10px] font-semibold text-slate-400">VALOR ANTERIOR:</Text>
                        <Text className="text-xs text-slate-600 font-mono bg-white p-1.5 rounded-lg border border-slate-200/60 mt-0.5">
                          {log.old_value}
                        </Text>
                      </View>
                    )}

                    {Boolean(log.new_value) && (
                      <View className="mt-1">
                        <Text className="text-[10px] font-semibold text-emerald-600">NUEVO VALOR:</Text>
                        <Text className="text-xs text-slate-700 font-mono bg-white p-1.5 rounded-lg border border-slate-200/60 mt-0.5">
                          {log.new_value}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Footer */}
          <TouchableOpacity
            onPress={onRefresh}
            className="w-full py-3.5 bg-purple-600 rounded-xl items-center mt-3"
          >
            <Text className="text-white text-sm font-semibold">Refrescar Registros</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
