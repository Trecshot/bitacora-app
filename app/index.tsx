import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import {
  FolderPlus,
  Search,
  FolderTree,
  History,
  CheckCircle2,
  Folder as FolderIcon,
  FileText,
  FolderKanban,
} from 'lucide-react-native';
import {
  getFolders,
  createFolder,
  deleteFolder,
  getAuditLogs,
  Folder,
  AuditLog,
} from '../src/db/database';
import { FolderCard } from '../src/components/FolderCard';
import { CreateFolderModal } from '../src/components/CreateFolderModal';
import { AuditLogModal } from '../src/components/AuditLogModal';
import { NotesView } from '../src/components/NotesView';

export default function HomeScreen() {
  const router = useRouter();
  const [activeModule, setActiveModule] = useState<'NOTES' | 'PROJECTS'>('NOTES');

  // Estados del módulo de Proyectos
  const [folders, setFolders] = useState<Folder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const loadData = useCallback(() => {
    try {
      const data = getFolders(null);
      setFolders(data);
    } catch (e) {
      console.error('Error cargando carpetas:', e);
    }
  }, []);

  const loadAuditLogs = useCallback(() => {
    try {
      const logs = getAuditLogs(40);
      setAuditLogs(logs);
    } catch (e) {
      console.error('Error cargando registros de auditoría:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (activeModule === 'PROJECTS') {
        loadData();
      }
    }, [activeModule, loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  const handleCreateFolder = (name: string, color: string) => {
    try {
      createFolder(name, null, color);
      loadData();
    } catch (e) {
      Alert.alert('Error', 'No se pudo crear la carpeta.');
    }
  };

  const handleDeleteFolder = (id: number) => {
    Alert.alert(
      'Eliminar Carpeta',
      '¿Estás seguro de eliminar esta carpeta y todas sus tareas asociadas? El trigger registrará la acción.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            try {
              deleteFolder(id);
              loadData();
            } catch (e) {
              Alert.alert('Error', 'No se pudo eliminar la carpeta.');
            }
          },
        },
      ]
    );
  };

  const openAuditLogs = () => {
    loadAuditLogs();
    setIsAuditModalOpen(true);
  };

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalTasks = folders.reduce((sum, f) => sum + (f.task_count || 0), 0);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Stack.Screen
        options={{
          title: activeModule === 'NOTES' ? 'Bloc de Notas' : 'Proyectos & Kanban',
          headerShadowVisible: false,
        }}
      />

      {/* Selector de Módulo: Notas vs Proyectos */}
      <View className="px-4 py-2 bg-white border-b border-slate-100 flex-row">
        <View className="flex-1 flex-row bg-slate-100 p-1 rounded-2xl">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveModule('NOTES')}
            className={`flex-1 py-2 rounded-xl flex-row items-center justify-center ${
              activeModule === 'NOTES' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <FileText size={15} color={activeModule === 'NOTES' ? '#2563EB' : '#64748B'} />
            <Text
              className={`text-xs ml-1.5 font-bold ${
                activeModule === 'NOTES' ? 'text-slate-800' : 'text-slate-500'
              }`}
            >
              Bloc de Notas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setActiveModule('PROJECTS');
              loadData();
            }}
            className={`flex-1 py-2 rounded-xl flex-row items-center justify-center ${
              activeModule === 'PROJECTS' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <FolderKanban size={15} color={activeModule === 'PROJECTS' ? '#2563EB' : '#64748B'} />
            <Text
              className={`text-xs ml-1.5 font-bold ${
                activeModule === 'PROJECTS' ? 'text-slate-800' : 'text-slate-500'
              }`}
            >
              Proyectos Kanban
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Renderizado Condicional del Módulo Activo */}
      {activeModule === 'NOTES' ? (
        <NotesView />
      ) : (
        <View className="flex-1 px-4 pt-3">
          {/* Banner de Resumen y Métricas de Proyectos */}
          <View className="bg-white rounded-3xl p-4 mb-4 border border-slate-200/70 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-2xl bg-blue-600 items-center justify-center mr-3 shadow-md shadow-blue-500/20">
                  <FolderTree size={20} color="#FFFFFF" />
                </View>
                <View>
                  <Text className="text-base font-bold text-slate-800">Panel de Bitácora</Text>
                  <Text className="text-xs text-slate-500">Persistencia SQLite & Triggers</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={openAuditLogs}
                className="flex-row items-center bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200"
              >
                <History size={14} color="#7C3AED" />
                <Text className="text-xs font-semibold text-purple-700 ml-1.5">Auditoría</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row divide-x divide-slate-100 pt-2 border-t border-slate-100">
              <View className="flex-1 items-center py-1">
                <View className="flex-row items-center">
                  <FolderIcon size={14} color="#3B82F6" />
                  <Text className="text-base font-bold text-slate-800 ml-1.5">{folders.length}</Text>
                </View>
                <Text className="text-[11px] text-slate-400 mt-0.5">Carpetas Raíz</Text>
              </View>
              <View className="flex-1 items-center py-1">
                <View className="flex-row items-center">
                  <CheckCircle2 size={14} color="#10B981" />
                  <Text className="text-base font-bold text-slate-800 ml-1.5">{totalTasks}</Text>
                </View>
                <Text className="text-[11px] text-slate-400 mt-0.5">Tareas Totales</Text>
              </View>
            </View>
          </View>

          {/* Buscador y Añadir Carpeta */}
          <View className="flex-row items-center space-x-2 mb-4">
            <View className="flex-1 flex-row items-center bg-white px-3.5 py-2.5 rounded-2xl border border-slate-200/80 mr-2 shadow-sm">
              <Search size={18} color="#94A3B8" />
              <TextInput
                placeholder="Buscar carpetas..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-2 text-sm text-slate-800"
              />
            </View>

            <TouchableOpacity
              onPress={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 w-11 h-11 rounded-2xl items-center justify-center shadow-md shadow-blue-500/20"
            >
              <FolderPlus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Lista de Carpetas */}
          <FlatList
            data={filteredFolders}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <FolderCard
                folder={item}
                onPress={() => router.push(`/folder/${item.id}`)}
                onDelete={handleDeleteFolder}
              />
            )}
            ListEmptyComponent={
              <View className="py-16 items-center">
                <View className="w-16 h-16 rounded-3xl bg-slate-100 items-center justify-center mb-3">
                  <FolderIcon size={32} color="#94A3B8" />
                </View>
                <Text className="text-base font-semibold text-slate-700">No se encontraron carpetas</Text>
                <Text className="text-xs text-slate-400 mt-1 text-center px-8">
                  Crea una nueva carpeta con el botón (+) para comenzar a organizar tus tareas y notas.
                </Text>
              </View>
            }
          />
        </View>
      )}

      {/* Modal para crear carpeta */}
      <CreateFolderModal
        visible={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateFolder}
      />

      {/* Modal visor del log de auditoría SQLite */}
      <AuditLogModal
        visible={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        logs={auditLogs}
        onRefresh={loadAuditLogs}
      />
    </SafeAreaView>
  );
}
