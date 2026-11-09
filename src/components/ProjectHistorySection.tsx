import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import {
  History,
  ChevronDown,
  RotateCw,
  CalendarClock,
} from 'lucide-react-native';
import { AuditLog, getProjectAuditLogsAsync } from '../db/database';
import {
  groupAuditLogsByRelativeDate,
  AuditLogSection,
} from '../utils/auditParser';
import { triggerHapticImpact } from '../utils/haptics';
import { AuditLogEntryCard } from './AuditLogEntryCard';
import { useTheme } from '../theme/ThemeContext';

interface ProjectHistorySectionProps {
  folderId: number;
}

const PAGE_SIZE = 15;

export const ProjectHistorySection: React.FC<ProjectHistorySectionProps> = ({ folderId }) => {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [hasMoreLogs, setHasMoreLogs] = useState(false);

  const pageRef = useRef(0);

  // Agrupación memoizada bajo cabeceras de fechas relativas: "Hoy", "Ayer", "La semana pasada"
  const groupedSections: AuditLogSection[] = useMemo(() => {
    return groupAuditLogsByRelativeDate(logs);
  }, [logs]);

  // Animación del chevron con Reanimated
  const chevronRotation = useSharedValue(0); // 0 = colapsado (-90 deg), 1 = expandido (0 deg)

  useEffect(() => {
    chevronRotation.value = withTiming(isExpanded ? 1 : 0, { duration: 220 });
  }, [isExpanded, chevronRotation]);

  const animatedChevronStyle = useAnimatedStyle(() => {
    'worklet';
    const angle = (1 - chevronRotation.value) * -90;
    return {
      transform: [{ rotate: `${angle}deg` }],
    };
  });

  /**
   * Carga perezosa (Lazy Loading):
   * La consulta SQLite se ejecuta ÚNICAMENTE cuando el usuario expande la sección
   * o solicita refrescar, evitando saturar el hilo principal en el render inicial.
   */
  const fetchProjectHistory = useCallback(
    async (pageToLoad = 0, append = false) => {
      try {
        if (pageToLoad === 0) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        const offset = pageToLoad * PAGE_SIZE;
        // Consulta paginada acotada por folder_id con índice compuesto idx_audit_folder_timestamp
        const fetchedLogs = await getProjectAuditLogsAsync(folderId, PAGE_SIZE, offset);

        if (append) {
          setLogs((prev) => [...prev, ...fetchedLogs]);
        } else {
          setLogs(fetchedLogs);
        }

        setHasMoreLogs(fetchedLogs.length === PAGE_SIZE);
        pageRef.current = pageToLoad;
        setHasLoadedOnce(true);
      } catch (err) {
        console.error('Error cargando historial acotado del proyecto:', err);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [folderId]
  );

  const toggleExpand = () => {
    triggerHapticImpact();
    const nextState = !isExpanded;
    setIsExpanded(nextState);

    // Si se expande por primera vez, activar Lazy Loading
    if (nextState && !hasLoadedOnce) {
      fetchProjectHistory(0, false);
    }
  };

  const handleRefresh = (e: any) => {
    e.stopPropagation?.();
    triggerHapticImpact();
    fetchProjectHistory(0, false);
  };

  const handleFetchNextPage = () => {
    triggerHapticImpact();
    fetchProjectHistory(pageRef.current + 1, true);
  };

  return (
    <View style={[theme.cardStyle, { marginBottom: 16, overflow: 'hidden' }]}>
      {/* Cabecera Colapsable del Historial Acotado */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={toggleExpand}
        className="flex-row items-center justify-between px-4 py-3 border-b"
        style={{
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
        }}
      >
        <View className="flex-row items-center flex-1 mr-2">
          <View
            className="w-8 h-8 rounded-xl items-center justify-center mr-2.5 border"
            style={{
              backgroundColor: `${theme.colors.accent}15`,
              borderColor: `${theme.colors.accent}30`,
            }}
          >
            <History size={16} color={theme.colors.accent} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text
                className="text-sm font-bold mr-2"
                style={{ color: theme.colors.text }}
              >
                Historial de Actividad
              </Text>
              {hasLoadedOnce && logs.length > 0 && (
                <View
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${theme.colors.accent}20` }}
                >
                  <Text
                    className="text-[10px] font-bold"
                    style={{ color: theme.colors.accent }}
                  >
                    {logs.length}
                    {hasMoreLogs ? '+' : ''}
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-[11px] mt-0.5" style={{ color: theme.colors.textMuted }}>
              Agrupado dinámicamente (Hoy, Ayer, La semana pasada)
            </Text>
          </View>
        </View>

        <View className="flex-row items-center space-x-1.5">
          {isExpanded && (
            <TouchableOpacity
              onPress={handleRefresh}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="p-1.5 mr-1 rounded-lg border shadow-sm"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }}
            >
              <RotateCw size={12} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}

          <Animated.View style={animatedChevronStyle} className="p-1">
            <ChevronDown size={18} color={theme.colors.textMuted} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Contenido Expandible: Lazy Loading + SectionList agrupada con useMemo */}
      {isExpanded && (
        <View className="p-4">
          {isLoading ? (
            <View className="py-8 items-center justify-center">
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text className="text-xs mt-2" style={{ color: theme.colors.textMuted }}>
                Consultando eventos en SQLite...
              </Text>
            </View>
          ) : groupedSections.length === 0 ? (
            <View className="py-6 items-center justify-center">
              <Text
                className="text-xs font-medium text-center"
                style={{ color: theme.colors.textMuted }}
              >
                No hay actividad registrada en este proyecto aún.
              </Text>
              <Text
                className="text-[11px] text-center mt-0.5"
                style={{ color: theme.colors.textMuted }}
              >
                Los cambios de estado, tareas y notas generarán eventos automáticos.
              </Text>
            </View>
          ) : (
            <View>
              <SectionList
                sections={groupedSections}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                stickySectionHeadersEnabled={false}
                renderSectionHeader={({ section }) => (
                  <View
                    className="flex-row items-center justify-between px-3 py-1.5 rounded-xl mb-2 mt-1 border"
                    style={{
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <View className="flex-row items-center">
                      <CalendarClock size={12} color={theme.colors.textSecondary} />
                      <Text
                        className="text-xs font-bold ml-1.5"
                        style={{ color: theme.colors.text }}
                      >
                        {section.title}
                      </Text>
                    </View>
                    <Text
                      className="text-[10px] font-bold"
                      style={{ color: theme.colors.textMuted }}
                    >
                      {section.data.length} evento{section.data.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                )}
                renderItem={({ item: log }) => <AuditLogEntryCard log={log} compact />}
              />

              {/* Botón de Paginación: Cargar más registros */}
              {hasMoreLogs && (
                <TouchableOpacity
                  onPress={handleFetchNextPage}
                  disabled={isLoadingMore}
                  activeOpacity={0.7}
                  className="w-full py-2.5 mt-2 rounded-xl border items-center justify-center flex-row"
                  style={{
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  }}
                >
                  {isLoadingMore ? (
                    <ActivityIndicator size="small" color={theme.colors.accent} />
                  ) : (
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: theme.colors.accent }}
                    >
                      Cargar más registros
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
};
