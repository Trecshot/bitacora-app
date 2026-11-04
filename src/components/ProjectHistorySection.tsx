import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  SectionList,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  History,
  ChevronDown,
  RotateCw,
  PlusCircle,
  ArrowRightLeft,
  Edit3,
  Trash2,
  CheckCircle2,
  CalendarClock,
  RotateCcw,
} from 'lucide-react-native';
import { AuditLog, getProjectAuditLogsAsync } from '../db/database';
import {
  parseAuditLogEntry,
  ParsedAuditEntry,
  groupAuditLogsByRelativeDate,
  AuditLogSection,
} from '../utils/auditParser';

interface ProjectHistorySectionProps {
  folderId: number;
}

const PAGE_SIZE = 15;

export const ProjectHistorySection: React.FC<ProjectHistorySectionProps> = ({ folderId }) => {
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

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(style).catch(() => {});
    }
  };

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
    triggerHaptic();
    const nextState = !isExpanded;
    setIsExpanded(nextState);

    // Si se expande por primera vez, activar Lazy Loading
    if (nextState && !hasLoadedOnce) {
      fetchProjectHistory(0, false);
    }
  };

  const handleRefresh = (e: any) => {
    e.stopPropagation?.();
    triggerHaptic();
    fetchProjectHistory(0, false);
  };

  const handleFetchNextPage = () => {
    triggerHaptic();
    fetchProjectHistory(pageRef.current + 1, true);
  };

  const getBadgeStyle = (type: ParsedAuditEntry['badgeType']) => {
    switch (type) {
      case 'CREATE':
        return {
          bg: 'bg-emerald-50 border-emerald-200',
          text: 'text-emerald-700',
          icon: <PlusCircle size={11} color="#059669" />,
        };
      case 'RESTORE':
        return {
          bg: 'bg-teal-50 border-teal-200',
          text: 'text-teal-700',
          icon: <RotateCcw size={11} color="#0D9488" />,
        };
      case 'STATUS':
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-700',
          icon: <ArrowRightLeft size={11} color="#2563EB" />,
        };
      case 'PRIORITY':
        return {
          bg: 'bg-amber-50 border-amber-200',
          text: 'text-amber-700',
          icon: <Edit3 size={11} color="#D97706" />,
        };
      case 'DELETE':
        return {
          bg: 'bg-rose-50 border-rose-200',
          text: 'text-rose-700',
          icon: <Trash2 size={11} color="#E11D48" />,
        };
      default:
        return {
          bg: 'bg-slate-100 border-slate-200',
          text: 'text-slate-700',
          icon: <CheckCircle2 size={11} color="#475569" />,
        };
    }
  };

  return (
    <View className="bg-white rounded-3xl mb-4 border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Cabecera Colapsable del Historial Acotado */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={toggleExpand}
        className="flex-row items-center justify-between px-4 py-3 bg-slate-50/70 border-b border-slate-100"
      >
        <View className="flex-row items-center flex-1 mr-2">
          <View className="w-8 h-8 rounded-xl bg-purple-50 items-center justify-center mr-2.5 border border-purple-100">
            <History size={16} color="#7C3AED" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-sm font-bold text-slate-800 mr-2">
                Historial de Actividad
              </Text>
              {hasLoadedOnce && logs.length > 0 && (
                <View className="bg-purple-100/70 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-bold text-purple-700">
                    {logs.length}
                    {hasMoreLogs ? '+' : ''}
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-[11px] text-slate-400 mt-0.5">
              Agrupado dinámicamente (Hoy, Ayer, La semana pasada)
            </Text>
          </View>
        </View>

        <View className="flex-row items-center space-x-1.5">
          {isExpanded && (
            <TouchableOpacity
              onPress={handleRefresh}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="p-1.5 mr-1 rounded-lg bg-white border border-slate-200 shadow-sm"
            >
              <RotateCw size={12} color="#64748B" />
            </TouchableOpacity>
          )}

          <Animated.View style={animatedChevronStyle} className="p-1">
            <ChevronDown size={18} color="#94A3B8" />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Contenido Expandible: Lazy Loading + SectionList agrupada con useMemo */}
      {isExpanded && (
        <View className="p-4">
          {isLoading ? (
            <View className="py-8 items-center justify-center">
              <ActivityIndicator size="small" color="#7C3AED" />
              <Text className="text-xs text-slate-400 mt-2">
                Consultando eventos en SQLite...
              </Text>
            </View>
          ) : groupedSections.length === 0 ? (
            <View className="py-6 items-center justify-center">
              <Text className="text-xs text-slate-400 font-medium text-center">
                No hay actividad registrada en este proyecto aún.
              </Text>
              <Text className="text-[11px] text-slate-400 text-center mt-0.5">
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
                  <View className="flex-row items-center justify-between bg-slate-100/90 px-3 py-1.5 rounded-xl mb-2 mt-1 border border-slate-200/60">
                    <View className="flex-row items-center">
                      <CalendarClock size={12} color="#64748B" />
                      <Text className="text-xs font-bold text-slate-700 ml-1.5">
                        {section.title}
                      </Text>
                    </View>
                    <Text className="text-[10px] font-bold text-slate-500">
                      {section.data.length} evento{section.data.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                )}
                renderItem={({ item: log }) => {
                  const parsed = parseAuditLogEntry(log);
                  const style = getBadgeStyle(parsed.badgeType);

                  return (
                    <View className="p-3 mb-2 rounded-2xl bg-slate-50 border border-slate-200/70">
                      <View className="flex-row items-center justify-between mb-1">
                        <View
                          className={`flex-row items-center px-2 py-0.5 rounded-md border ${style.bg}`}
                        >
                          {style.icon}
                          <Text
                            className={`text-[10px] font-bold tracking-wide ml-1 ${style.text}`}
                          >
                            {parsed.badgeLabel}
                          </Text>
                        </View>
                        <Text className="text-[10px] text-slate-400">{log.timestamp}</Text>
                      </View>

                      <Text className="text-xs font-bold text-slate-800 mt-0.5" numberOfLines={1}>
                        {parsed.title}
                      </Text>

                      <Text className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        {parsed.summary}
                      </Text>

                      {Boolean(parsed.detail) && (
                        <Text className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          {parsed.detail}
                        </Text>
                      )}
                    </View>
                  );
                }}
              />

              {/* Botón de Paginación: Cargar más registros */}
              {hasMoreLogs && (
                <TouchableOpacity
                  onPress={handleFetchNextPage}
                  disabled={isLoadingMore}
                  activeOpacity={0.7}
                  className="w-full py-2.5 mt-2 bg-purple-50 rounded-xl border border-purple-200 items-center justify-center flex-row"
                >
                  {isLoadingMore ? (
                    <ActivityIndicator size="small" color="#7C3AED" />
                  ) : (
                    <Text className="text-xs font-semibold text-purple-700">
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
