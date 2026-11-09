export const INITIAL_PROJECT_VISION_MARKDOWN =
  '# Visión del Proyecto\nEste espacio centraliza las tareas, hitos y contexto clave del proyecto.\n\n- **Objetivo**: Optimizar la productividad y organización.\n- **Metodología**: Tablero Kanban interactivo con persistencia local SQLite.';

export const SEED_FOLDERS_DATA = [
  {
    name: 'Proyecto Principal',
    color: '#3B82F6',
    icon: 'folder-kanban',
    description: INITIAL_PROJECT_VISION_MARKDOWN,
    createdDaysOffset: -10,
  },
  {
    name: 'Documentación & Arquitectura',
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
