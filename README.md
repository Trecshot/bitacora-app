# Bitácora App 📝

Aplicación móvil de gestión de notas, carpetas y tareas estilo Kanban desarrollada con **React Native**, **Expo SDK 58**, **TypeScript**, **Expo Router**, **NativeWind (Tailwind CSS)** y **Expo SQLite**.

---

## 🚀 Arquitectura y Características

### 1. Persistencia y Triggers Locales (SQLite)
* **Conexión sincrónica:** Manejada mediante `SQLite.openDatabaseSync('bitacora.db')`.
* **Tablas principales:**
  * `Folders`: Jerarquía de carpetas y subcarpetas con soporte `ON DELETE CASCADE`.
  * `Tasks`: Tareas asignadas a carpetas con estados Kanban (`TODO`, `IN_PROGRESS`, `DONE`) y prioridades.
  * `Audit_Logs`: Historial de eventos generado de manera automática en SQLite.
* **Triggers de Auditoría:**
  * `trg_tasks_insert`: Registra `CREATE` al insertar tareas.
  * `trg_tasks_update`: Registra transiciones de estado (`STATUS_CHANGE`) y modificaciones (`UPDATE`).
  * `trg_tasks_delete`: Registra `DELETE` con copia del estado previo.
  * Triggers análogos automáticos para `Folders`.

### 2. Navegación por Archivos (Expo Router)
* `/app/_layout.tsx`: Configuración apilada (`Stack`) envuelta en `GestureHandlerRootView`.
* `/app/index.tsx`: Pantalla raíz con estadísticas, buscador de carpetas y visor de auditoría.
* `/app/folder/[id].tsx`: Ruta dinámica para explorar carpetas, gestionar subcarpetas y administrar tareas en el Kanban.

### 3. Componentes y UI Interactiva
* **NativeWind / Tailwind CSS:** Estilización con clases utilitarias en componentes nativos.
* **Lucide Icons:** Iconografía minimalista optimizada para React Native.
* **Gestos y Animaciones en Hilo Nativo:** `react-native-reanimated` y `react-native-gesture-handler` para deslizar (`swipe`) tareas y alternar estados de Kanban.

---

## 📂 Estructura del Repositorio

```text
bitacora-app/
├── app/
│   ├── _layout.tsx         # Contenedor Stack + GestureHandlerRootView
│   ├── index.tsx           # Vista principal de carpetas y métricas
│   └── folder/
│       └── [id].tsx        # Ruta dinámica: detalle de carpeta y Kanban
├── src/
│   ├── components/
│   │   ├── FolderCard.tsx        # Tarjeta modular con Tailwind
│   │   ├── TaskItem.tsx          # Ítem deslizable (Swipe) con Reanimated
│   │   ├── CreateFolderModal.tsx # Modal de creación de carpetas
│   │   ├── CreateTaskModal.tsx   # Modal de creación de tareas
│   │   └── AuditLogModal.tsx     # Visor de triggers de auditoría SQLite
│   └── db/
│       └── database.ts     # Conexión sincrónica SQLite, tablas y triggers
├── babel.config.js         # Configuración de plugins NativeWind y Reanimated
├── tailwind.config.js      # Definición de rutas para Tailwind
├── metro.config.js         # Integración Metro + NativeWind
└── global.css              # Directivas Tailwind
```

---

## 🛠️ Instalación y Ejecución

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Trecshot/bitacora-app.git
   cd bitacora-app
   ```

2. Instala las dependencias:
   ```bash
   npm install --legacy-peer-deps
   ```

3. Inicia el entorno de Expo:
   ```bash
   npx expo start
   ```

---
Desarrollado para la gestión eficiente de bitácoras y tareas con persistencia local robusta.
