import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
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
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
      className="flex-1"
    >
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.id);

        return (
          <View
            key={col.id}
            className="w-[280px] mr-3 bg-slate-100/90 rounded-3xl p-3 border border-slate-200/80 flex-col"
            style={{ minHeight: 400 }}
          >
            {/* Cabecera de la Columna Kanban */}
            <View className={`flex-row items-center justify-between pb-2 mb-2 border-b-2 ${col.headerBorder}`}>
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

            {/* Lista de Tarjetas de la Columna */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
              className="flex-1"
            >
              {columnTasks.length === 0 ? (
                <View className="py-12 items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50 px-3">
                  <Text className="text-xs text-slate-400 font-medium text-center">
                    Columna vacía
                  </Text>
                  <Text className="text-[10px] text-slate-400 text-center mt-1">
                    Arrastra una tarjeta aquí o presiona (+) para agregar.
                  </Text>
                </View>
              ) : (
                columnTasks.map((task) => (
                  <OptimizedKanbanCard
                    key={task.id}
                    task={task}
                    onMoveStatus={onMoveStatus}
                    onDelete={onDeleteTask}
                  />
                ))
              )}
            </ScrollView>
          </View>
        );
      })}
    </ScrollView>
  );
};
