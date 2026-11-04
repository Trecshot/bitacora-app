import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Circle, Clock, CheckCircle2, Plus } from 'lucide-react-native';
import { Task, TaskStatus } from '../db/database';
import { OptimizedKanbanCard } from './OptimizedKanbanCard';

interface KanbanBoardViewProps {
  tasks: Task[];
  onMoveStatus: (id: number, nextStatus: TaskStatus) => void;
  onDeleteTask: (id: number) => void;
  onOpenCreateTask: (initialStatus: TaskStatus) => void;
}

const COLUMNS: {
  id: TaskStatus;
  title: string;
  badgeBg: string;
  badgeText: string;
  headerBorder: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'TODO',
    title: 'Por Hacer',
    badgeBg: 'bg-slate-200',
    badgeText: 'text-slate-700',
    headerBorder: 'border-slate-300',
    icon: <Circle size={15} color="#64748B" />,
  },
  {
    id: 'IN_PROGRESS',
    title: 'En Progreso',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    headerBorder: 'border-amber-400',
    icon: <Clock size={15} color="#D97706" />,
  },
  {
    id: 'DONE',
    title: 'Completado',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    headerBorder: 'border-emerald-400',
    icon: <CheckCircle2 size={15} color="#059669" />,
  },
];

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({
  tasks,
  onMoveStatus,
  onDeleteTask,
  onOpenCreateTask,
}) => {
  // Agrupación memoizada por columna para evitar recalcular filtros en cada frame
  const groupedTasks = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };
    for (const task of tasks) {
      if (map[task.status]) {
        map[task.status].push(task);
      }
    }
    return map;
  }, [tasks]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 24 }}
      className="flex-1"
    >
      {COLUMNS.map((col) => {
        const columnTasks = groupedTasks[col.id];

        return (
          <View
            key={col.id}
            className="w-[285px] mr-3 bg-slate-100/90 rounded-3xl p-3 border border-slate-200/80 flex-col"
            style={{ minHeight: 420, maxHeight: 560 }}
          >
            {/* Cabecera de la Columna Kanban */}
            <View
              className={`flex-row items-center justify-between pb-2.5 mb-2.5 border-b-2 ${col.headerBorder}`}
            >
              <View className="flex-row items-center">
                {col.icon}
                <Text className="text-sm font-bold text-slate-800 ml-1.5">{col.title}</Text>
                <View className={`ml-2 px-2 py-0.5 rounded-full ${col.badgeBg}`}>
                  <Text className={`text-xs font-bold ${col.badgeText}`}>
                    {columnTasks.length}
                  </Text>
                </View>
              </View>

              {/* Botón rápido para agregar tarea en esta columna */}
              <TouchableOpacity
                onPress={() => onOpenCreateTask(col.id)}
                className="w-7 h-7 rounded-xl bg-white items-center justify-center border border-slate-200 shadow-sm"
              >
                <Plus size={14} color="#334155" />
              </TouchableOpacity>
            </View>

            {/* Virtualización de Columna Kanban mediante Shopify FlashList */}
            <View className="flex-1" style={{ minHeight: 340 }}>
              <FlashList
                data={columnTasks}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                contentContainerStyle={{ paddingBottom: 16 }}
                renderItem={({ item }) => (
                  <OptimizedKanbanCard
                    task={item}
                    onMoveStatus={onMoveStatus}
                    onDelete={onDeleteTask}
                  />
                )}
                ListEmptyComponent={
                  <View className="py-12 items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50 px-3 mt-2">
                    <Text className="text-xs text-slate-400 font-medium text-center">
                      Sin tareas
                    </Text>
                    <Text className="text-[11px] text-slate-400 text-center mt-1">
                      Presiona (+) para añadir o desliza una tarea aquí.
                    </Text>
                  </View>
                }
              />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};
