import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from '../src/db/database';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import '../global.css';

function ThemedNavigation() {
  const { theme } = useTheme();

  return (
    <>
      <StatusBar style={theme.statusBarStyle} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: theme.typography.titleWeight,
            fontSize: 17,
            color: theme.colors.text,
          },
          headerTintColor: theme.colors.accent,
          contentStyle: {
            backgroundColor: theme.colors.background,
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
          name="notes/editor"
          options={{
            title: 'Nota',
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}

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
      <ThemeProvider initialMode="light">
        <ThemedNavigation />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
