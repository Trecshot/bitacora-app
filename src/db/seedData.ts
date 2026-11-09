// Generador de UUID v4 estándar para Note_Categories y Notes
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const INITIAL_PROJECT_VISION_MARKDOWN =
  '# Visión del Proyecto\nEste espacio centraliza las tareas, hitos y notas clave de la bitácora.\n\n- **Objetivo**: Optimizar la productividad y organización.\n- **Metodología**: Tablero Kanban interactivo con persistencia local SQLite.';

export const SEED_FOLDERS_DATA = [
  {
    name: 'Proyecto Principal',
    color: '#3B82F6',
    icon: 'folder-kanban',
    description: INITIAL_PROJECT_VISION_MARKDOWN,
    createdDaysOffset: -10,
  },
  {
    name: 'Documentación & Notas',
    color: '#10B981',
    icon: 'book-open',
    description:
      'Documentación técnica del sistema, guías y especificaciones de arquitectura.',
    createdDaysOffset: -5,
  },
  {
    name: 'Diseño UI/UX',
    color: '#8B5CF6',
    icon: 'palette',
    description: 'Bocetos, patrones de componentes y guías de estilos para la aplicación.',
    createdDaysOffset: -3,
  },
] as const;

export const SEED_TAGS_DATA = [
  { name: 'Urgente', color: '#EF4444' },
  { name: 'Trabajo', color: '#3B82F6' },
  { name: 'Ideas', color: '#F59E0B' },
  { name: 'Universidad', color: '#10B981' },
  { name: 'Personal', color: '#8B5CF6' },
] as const;
