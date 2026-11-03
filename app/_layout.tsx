import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from '../src/db/database';
import '../global.css';

export default function RootLayout() {
  useEffect(() => {
    try {
      initDatabase();
    } catch (error) {
      console.error('Error inicializando base de datos SQLite:', error);
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
            color: '#1E293B',
          },
          headerTintColor: '#2563EB',
          contentStyle: {
            backgroundColor: '#F8FAFC',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Mi Bitácora',
            headerLargeTitle: false,
          }}
        />
        <Stack.Screen
          name="folder/[id]"
          options={{
            title: 'Detalle de Carpeta',
            headerBackTitle: 'Carpetas',
          }}
        />
        <Stack.Screen
          name="notes/index"
          options={{
            title: 'Bloc de Notas',
            headerBackTitle: 'Atrás',
          }}
        />
        <Stack.Screen
          name="notes/editor"
          options={{
            title: 'Nota',
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
