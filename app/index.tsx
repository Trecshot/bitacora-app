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
  AlertTriangle,
  Settings,
} from 'lucide-react-native';
import {
  getFolders,
  createFolder,
  deleteFolder,
  getAuditLogs,
  getGlobalStaleTasksCount,
  Folder,
  AuditLog,
} from '../src/db/database';
import { FolderCard } from '../src/components/FolderCard';
import { CreateFolderModal } from '../src/components/CreateFolderModal';
import { AuditLogModal } from '../src/components/AuditLogModal';
import { useTheme } from '../src/theme/ThemeContext';

export default function HomeScreen() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  // Estados del módulo de Proyectos
  const [folders, setFolders] = useState<Folder[]>([]);
  const [globalStaleCount, setGlobalStaleCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const handleOpenSettings = () => {
    Alert.alert(
      'Configuración',
      `Tema activo: ${theme.name}`,
      [
        {
          text: theme.isDark ? '☀️ Cambiar a Modo Claro' : '🌙 Cambiar a Modo Oscuro (AMOLED)',
          onPress: () => toggleTheme(),
        },
        {
          text: '📋 Registro de Auditoría',
          onPress: openAuditLogs,
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const loadData = useCallback(() => {
    try {
      const data = getFolders(null);
      setFolders(data);
      setGlobalStaleCount(getGlobalStaleTasksCount());
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
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  const handleCreateFolder = (name: string, color: string, description = '') => {
    try {
      createFolder(name, null, color, description);
      loadData();
    } catch {
      Alert.alert('Error', 'No se pudo crear la carpeta.');
    }
  };

  const handleDeleteFolder = (id: number) => {
    Alert.alert(
      'Eliminar Carpeta',
      '¿Estás seguro de eliminar esta carpeta y todas sus tareas asociadas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            try {
              deleteFolder(id);
              loadData();
            } catch {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Cabecera Principal */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 10,
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: '700',
            color: theme.colors.text,
            letterSpacing: -0.4,
          }}
        >
          Proyectos Kanban
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleOpenSettings}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.isDark ? theme.colors.surfaceElevated : '#F1F5F9',
            borderColor: theme.colors.border,
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Settings size={20} color={theme.isDark ? '#E0E0E0' : '#475569'} />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 4 }}>
        {/* Banner de Resumen y Métricas de Proyectos (con Cálculo de Estancamiento) */}
        <View
          style={[
            theme.cardStyle,
            {
              borderRadius: theme.metrics.radii.xl,
              padding: 16,
              marginBottom: 16,
            },
          ]}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: theme.metrics.radii.md,
                  backgroundColor: theme.colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <FolderTree size={20} color={theme.colors.accentText} />
              </View>
              <View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: theme.typography.titleWeight,
                    color: theme.colors.text,
                  }}
                >
                  Panel de Bitácora
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>
                  Organización de proyectos y tareas
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={openAuditLogs}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
                borderWidth: 1,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: theme.metrics.radii.md,
              }}
            >
              <History size={13} color={theme.colors.accent} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: theme.colors.accent,
                  marginLeft: 6,
                }}
              >
                Auditoría
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              flexDirection: 'row',
              borderTopColor: theme.colors.border,
              borderTopWidth: 1,
              paddingTop: 8,
            }}
          >
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
              <View className="flex-row items-center">
                <FolderIcon size={14} color={theme.colors.accent} />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: theme.colors.text,
                    marginLeft: 6,
                  }}
                >
                  {folders.length}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 2 }}>
                Carpetas Raíz
              </Text>
            </View>

            <View
              style={{
                width: 1,
                backgroundColor: theme.colors.border,
                marginVertical: 4,
              }}
            />

            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
              <View className="flex-row items-center">
                <CheckCircle2 size={14} color={theme.colors.success} />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: theme.colors.text,
                    marginLeft: 6,
                  }}
                >
                  {totalTasks}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 2 }}>
                Tareas Activas
              </Text>
            </View>

            <View
              style={{
                width: 1,
                backgroundColor: theme.colors.border,
                marginVertical: 4,
              }}
            />

            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
              <View className="flex-row items-center">
                <AlertTriangle
                  size={14}
                  color={globalStaleCount > 0 ? theme.colors.warning : theme.colors.textMuted}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: globalStaleCount > 0 ? theme.colors.warning : theme.colors.text,
                    marginLeft: 6,
                  }}
                >
                  {globalStaleCount}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 2 }}>
                Estancadas (&gt;7d)
              </Text>
            </View>
          </View>

          {globalStaleCount > 0 && (
            <View
              style={{
                marginTop: 10,
                padding: 8,
                borderRadius: theme.metrics.radii.md,
                backgroundColor: theme.colors.warningSubtle,
                borderColor: theme.colors.warning,
                borderWidth: 1,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <AlertTriangle size={14} color={theme.colors.warning} />
              <Text
                style={{
                  fontSize: 11,
                  color: theme.colors.warning,
                  fontWeight: '500',
                  marginLeft: 8,
                  flex: 1,
                }}
              >
                Alerta de estancamiento: {globalStaleCount} tarea
                {globalStaleCount === 1 ? '' : 's'} en &quot;En Progreso&quot; sin cambios en más
                de 7 días.
              </Text>
            </View>
          )}
        </View>

        {/* Buscador y Añadir Carpeta */}
        <View className="flex-row items-center space-x-2 mb-4">
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.inputBg,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: theme.metrics.radii.lg,
              borderColor: theme.colors.border,
              borderWidth: 1,
              marginRight: 8,
            }}
          >
            <Search size={16} color={theme.colors.textMuted} />
            <TextInput
              placeholder="Buscar carpetas..."
              placeholderTextColor={theme.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{
                flex: 1,
                marginLeft: 8,
                fontSize: 14,
                color: theme.colors.text,
              }}
            />
          </View>

          <TouchableOpacity
            onPress={() => setIsCreateModalOpen(true)}
            style={{
              backgroundColor: theme.colors.accent,
              width: 44,
              height: 44,
              borderRadius: theme.metrics.radii.lg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FolderPlus size={20} color={theme.colors.accentText} />
          </TouchableOpacity>
        </View>

        {/* Lista de Carpetas */}
        <FlatList
          data={filteredFolders}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.accent]}
              tintColor={theme.colors.accent}
            />
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
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: theme.metrics.radii.xl,
                  backgroundColor: theme.colors.surfaceElevated,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                }}
              >
                <FolderIcon size={28} color={theme.colors.textMuted} />
              </View>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: theme.colors.text,
                }}
              >
                No se encontraron carpetas
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: theme.colors.textMuted,
                  marginTop: 4,
                  textAlign: 'center',
                  paddingHorizontal: 32,
                }}
              >
                Crea una nueva carpeta con el botón (+) para comenzar a organizar tus tareas y
                proyectos.
              </Text>
            </View>
          }
        />
      </View>

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
