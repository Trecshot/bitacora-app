import React from 'react';
import { Stack } from 'expo-router';
import { NotesView } from '../../src/components/NotesView';

export default function NotesScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Bloc de Notas',
          headerBackTitle: 'Atrás',
        }}
      />
      <NotesView />
    </>
  );
}
