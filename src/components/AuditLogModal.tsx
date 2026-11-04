import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, History, CheckCircle2, ArrowRightLeft, PlusCircle, Trash2, Edit3 } from 'lucide-react-native';
import { AuditLog } from '../db/database';
import { parseAuditLogEntry, ParsedAuditEntry } from '../utils/auditParser';

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
  const getBadgeStyle = (type: ParsedAuditEntry['badgeType']) => {
    switch (type) {
      case 'CREATE':
        return {
          bg: 'bg-emerald-50 border-emerald-200',
          text: 'text-emerald-700',
          icon: <PlusCircle size={12} color="#059669" />,
        };
      case 'STATUS':
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-700',
          icon: <ArrowRightLeft size={12} color="#2563EB" />,
        };
      case 'PRIORITY':
        return {
          bg: 'bg-amber-50 border-amber-200',
          text: 'text-amber-700',
          icon: <Edit3 size={12} color="#D97706" />,
        };
      case 'DELETE':
        return {
          bg: 'bg-rose-50 border-rose-200',
          text: 'text-rose-700',
          icon: <Trash2 size={12} color="#E11D48" />,
        };
      default:
        return {
          bg: 'bg-slate-100 border-slate-200',
          text: 'text-slate-700',
          icon: <CheckCircle2 size={12} color="#475569" />,
        };
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
                <Text className="text-lg font-bold text-slate-800">Historial de Actividad</Text>
                <Text className="text-xs text-slate-500">
                  Registro cronológico de cambios en tareas y carpetas
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2">
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Lista de Registros de Auditoría con Lenguaje Natural */}
          <ScrollView className="flex-1 mt-4" showsVerticalScrollIndicator={false}>
            {logs.length === 0 ? (
              <View className="py-12 items-center">
                <Text className="text-sm text-slate-400">No hay actividad registrada aún.</Text>
              </View>
            ) : (
              logs.map((log) => {
                const parsed = parseAuditLogEntry(log);
                const style = getBadgeStyle(parsed.badgeType);

                return (
                  <View
                    key={log.id}
                    className="p-3.5 mb-2.5 rounded-2xl bg-slate-50 border border-slate-200/80"
                  >
                    <View className="flex-row items-center justify-between mb-1.5">
                      <View className={`flex-row items-center px-2 py-0.5 rounded-md border ${style.bg}`}>
                        {style.icon}
                        <Text className={`text-[10px] font-bold tracking-wide ml-1 ${style.text}`}>
                          {parsed.badgeLabel}
                        </Text>
                      </View>
                      <Text className="text-[11px] text-slate-400">{log.timestamp}</Text>
                    </View>

                    <Text className="text-sm font-bold text-slate-800 mt-0.5" numberOfLines={1}>
                      {parsed.title}
                    </Text>

                    <Text className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {parsed.summary}
                    </Text>

                    {Boolean(parsed.detail) && (
                      <Text className="text-[11px] text-slate-400 mt-1 font-medium">
                        {parsed.detail}
                      </Text>
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
            <Text className="text-white text-sm font-semibold">Actualizar Historial</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
