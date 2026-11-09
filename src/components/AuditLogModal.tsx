import React, { useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, SectionList } from 'react-native';
import { X, History, CalendarClock } from 'lucide-react-native';
import { AuditLog } from '../db/database';
import {
  groupAuditLogsByRelativeDate,
  AuditLogSection,
} from '../utils/auditParser';
import { AuditLogEntryCard } from './AuditLogEntryCard';
import { useTheme } from '../theme/ThemeContext';

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
  const { theme } = useTheme();

  // Agrupación memoizada bajo cabeceras de fechas relativas: "Hoy", "Ayer", "La semana pasada"
  const groupedSections: AuditLogSection[] = useMemo(() => {
    return groupAuditLogsByRelativeDate(logs);
  }, [logs]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View
          className="rounded-t-3xl p-6 h-[80%] border-t"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          }}
        >
          {/* Header */}
          <View
            className="flex-row items-center justify-between pb-4 border-b"
            style={{ borderColor: theme.colors.border }}
          >
            <View className="flex-row items-center">
              <View
                className="w-9 h-9 rounded-xl items-center justify-center mr-2.5"
                style={{ backgroundColor: `${theme.colors.accent}15` }}
              >
                <History size={20} color={theme.colors.accent} />
              </View>
              <View>
                <Text
                  className="text-lg font-bold"
                  style={{ color: theme.colors.text }}
                >
                  Historial de Actividad
                </Text>
                <Text
                  className="text-xs"
                  style={{ color: theme.colors.textMuted }}
                >
                  Agrupación dinámica por fechas relativas (Hoy, Ayer, La semana pasada)
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2">
              <X size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Lista de Registros de Auditoría agrupados en SectionList */}
          <View className="flex-1 mt-4">
            {groupedSections.length === 0 ? (
              <View className="py-12 items-center">
                <Text className="text-sm" style={{ color: theme.colors.textMuted }}>
                  No hay actividad registrada aún.
                </Text>
              </View>
            ) : (
              <SectionList
                sections={groupedSections}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled={false}
                renderSectionHeader={({ section }) => (
                  <View
                    className="flex-row items-center justify-between px-3.5 py-2 rounded-xl mb-2 mt-1 border"
                    style={{
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <View className="flex-row items-center">
                      <CalendarClock size={14} color={theme.colors.textSecondary} />
                      <Text
                        className="text-xs font-bold ml-1.5"
                        style={{ color: theme.colors.text }}
                      >
                        {section.title}
                      </Text>
                    </View>
                    <Text
                      className="text-[11px] font-bold"
                      style={{ color: theme.colors.textMuted }}
                    >
                      {section.data.length} evento{section.data.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                )}
                renderItem={({ item: log }) => <AuditLogEntryCard log={log} />}
              />
            )}
          </View>

          {/* Footer */}
          <TouchableOpacity
            onPress={onRefresh}
            className="w-full py-3.5 rounded-xl items-center mt-3"
            style={{ backgroundColor: theme.colors.accent }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: theme.colors.accentText }}
            >
              Actualizar Historial
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
