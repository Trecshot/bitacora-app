import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Zap, Terminal, ChevronDown, ChevronUp } from 'lucide-react-native';

interface DebugTelemetryProps {
  /** Permite activar el panel desde un menú de desarrollador oculto incluso fuera de __DEV__ */
  visibleBySecretMenu?: boolean;
  /** Métricas adicionales opcionales */
  folderDepth?: number;
  totalNestedTasks?: number;
}

/**
 * Componente condicional de telemetría y métricas de depuración.
 * Se oculta completamente en producción (__DEV__ === false) salvo que se active
 * explícitamente mediante el menú de desarrollador oculto.
 */
export const DebugTelemetry: React.FC<DebugTelemetryProps> = ({
  visibleBySecretMenu = false,
  folderDepth,
  totalNestedTasks,
}) => {
  const [expanded, setExpanded] = useState(false);

  // No renderizar absolutamente nada si no estamos en modo desarrollo ni se activó el menú oculto
  if (!__DEV__ && !visibleBySecretMenu) {
    return null;
  }

  // En modo desarrollo mostramos un disparador discreto colapsado por defecto para no contaminar la UI principal
  if (!expanded && !visibleBySecretMenu) {
    return (
      <View className="mt-2 pt-2 border-t border-slate-100 flex-row justify-end">
        <TouchableOpacity
          onPress={() => setExpanded(true)}
          activeOpacity={0.7}
          className="flex-row items-center bg-slate-100 px-2 py-0.5 rounded-md"
        >
          <Terminal size={10} color="#64748B" />
          <Text className="text-[10px] font-mono text-slate-500 ml-1">DEV TELEMETRY</Text>
          <ChevronDown size={10} color="#64748B" className="ml-1" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="mt-3 pt-2.5 border-t border-slate-100">
      <TouchableOpacity
        onPress={() => setExpanded(false)}
        activeOpacity={0.8}
        className="flex-row items-center justify-between bg-slate-900 px-3 py-2 rounded-xl"
      >
        <View className="flex-row items-center flex-1">
          <Zap size={12} color="#38BDF8" />
          <Text className="text-[11px] font-mono font-semibold text-sky-400 ml-1.5">
            Motor 60 FPS • UI Thread • SQLite WAL
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-[10px] font-mono text-emerald-400 mr-1.5">Optimistic UI</Text>
          <ChevronUp size={12} color="#94A3B8" />
        </View>
      </TouchableOpacity>

      {(folderDepth !== undefined || totalNestedTasks !== undefined) && (
        <View className="flex-row items-center justify-between px-2 pt-1.5">
          <Text className="text-[10px] font-mono text-slate-400">
            CTE Depth: {folderDepth ?? 0} • FlashList Virtualized
          </Text>
          <Text className="text-[10px] font-mono text-slate-400">
            Tareas anidadas (CTE): {totalNestedTasks ?? 0}
          </Text>
        </View>
      )}
    </View>
  );
};
