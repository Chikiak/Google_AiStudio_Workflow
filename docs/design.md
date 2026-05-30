# diseño_ui.md

**Nota Arquitectónica inicial:** Basado en el análisis del `state.md` y `idea.md`, el proyecto ya utiliza **Tailwind CSS
v4** en un entorno React 19. El ecosistema es una Extensión de Chrome (Popup/Sidebar y Content Script). El sistema de
diseño mantendrá una estética "Zero-Cognitive Load", ampliando la paleta de colores neutrales existente para soportar
los nuevos estados complejos de **Sincronización en la Nube (Cloud-Sync)** y la **Máquina del Tiempo de Perfiles (
Versionado)**, asegurando que la experiencia siga sintiéndose nativa, rápida y "Offline-First".

---

## 1. Resumen de la Experiencia (UX)

La evolución de la interfaz se centra en transformar una herramienta de utilidad local en un **Ecosistema de
Productividad Omnipresente**, sin añadir ruido visual.
El principio rector es la **"Tranquilidad del Usuario" (Peace of Mind)**:

1. **Sincronización Invisible:** El usuario debe saber de un vistazo (mediante un micro-indicador) que sus datos están
   respaldados, pero el proceso de sincronización jamás debe bloquear su flujo de trabajo, incluso si pierde la
   conexión.
2. **Experimentación sin Miedo:** La funcionalidad de "Máquina del Tiempo" (Versionado) se presenta como un panel
   contextual dentro de la edición del perfil, permitiendo iterar *prompts* libremente con la confianza absoluta de que
   cualquier degradación en los resultados de la IA puede revertirse con un solo clic.

## 2. Flujo de Navegación

Dado el contexto de Extensión de Chrome (espacio reducido en Popup o Sidebar), la navegación se estructura en un modelo
de capas (Drill-down):

* **Nivel 1: Dashboard Principal (Lista de Perfiles)**
    * *Header:* Barra de búsqueda, Filtros y el nuevo **Indicador de Estado de Sincronización (Cloud Status)**.
    * *Body:* Lista de tarjetas de perfiles.
    * *Acciones:* Crear Nuevo Perfil, Abrir Configuración/Cuenta.
* **Nivel 2: Modal de Configuración & Cuenta (Over-lay)**
    * Flujo de Autenticación (Login/Vincular cuenta).
    * *Toggle* (Interruptor) de Privacidad: "Habilitar/Pausar sincronización de perfiles".
* **Nivel 3: Vista de Detalle / Edición de Perfil**
    * Formulario de edición del Prompt.
    * *Acción Secundaria:* Pestaña o Botón flotante lateral "Historial de Versiones".
* **Nivel 4: Panel de "Máquina del Tiempo" (Versionado)**
    * Se desliza (Slide-in) sobrepuesto a la vista de edición.
    * Muestra una línea de tiempo (Timeline) cronológica.
    * Previsualización de diferencias (Diffs visuales opcionales) y botón "Restaurar esta versión".

## 3. Sistema de Diseño y Estilos

Se extiende el sistema basado en **Tailwind CSS v4** para acomodar las nuevas mecánicas de estado y feedback.

* **Tipografía:** `font-sans` (Inter).
* **Paleta de Colores (Variables Semánticas Expandidas):**
    * *Primary (Acciones principales):* Indigo (`bg-indigo-600`, hover: `bg-indigo-700`).
    * *Backgrounds:* Zinc (`bg-zinc-50` para fondo global, `bg-white` para tarjetas/modales). Dark Mode: `bg-zinc-900` /
      `bg-zinc-800`.
    * *Texto:* `text-zinc-900` (Títulos), `text-zinc-500` (Metadatos/Fechas).
    * *Cloud-Sync (Nuevos Estados):*
        * **Synced (Al día):** Sky/Blue (`text-sky-500`).
        * **Pending/Offline (Desconectado pero guardado localmente):** Amber (`text-amber-500`).
        * **Syncing (Sincronizando):** Indigo (`text-indigo-400` con animación de pulso o giro).
        * **Sync Paused/Disabled:** Zinc (`text-zinc-400`).
    * *Feedback general:* Emerald (Éxito), Red (Errores críticos).
* **Micro-interacciones:** Animaciones fluidas (`transition-all duration-200`) para transiciones de estado,
  especialmente en la restauración de versiones.

## 4. Arquitectura de Componentes (UI)

A continuación, se detalla la estructura para los nuevos componentes requeridos para la iniciativa, diseñados bajo la
metodología Atomic Design.

### 4.1. Átomos

#### `SyncStatusIcon`

* **Propósito:** Informar el estado actual de la sincronización en la nube (HU-01, HU-02).
* **Props:** `state` ('synced' | 'syncing' | 'offline' | 'paused' | 'error').
* **Estados Visuales:**
    * *Synced:* Icono de Nube con Check, color `text-sky-500`.
    * *Syncing:* Icono de Flechas circulares, `animate-spin text-indigo-400`.
    * *Offline:* Icono de Nube con raya diagonal, `text-amber-500`.
    * *Hover:* Muestra un `Tooltip` nativo o en componente con el texto explicativo (ej. "Trabajando sin conexión. Se
      sincronizará al reconectar").

#### `TimelineDot`

* **Propósito:** Nodo visual para el historial de iteraciones (HU-04).
* **Props:** `isActive` (boolean - indica si es la versión actual cargada).
* **Estilo Base:** Círculo pequeño `w-3 h-3 rounded-full`. Si `isActive` es true,
  `bg-indigo-600 ring-4 ring-indigo-100`. Si false, `bg-zinc-300`.

### 4.2. Moléculas

#### `SyncToggleSwitch`

* **Propósito:** Permitir al usuario pausar la sincronización por privacidad (HU-03).
* **Props:** `isSyncEnabled` (boolean), `onToggle` (function), `isLoading` (boolean).
* **Estructura:** Un control tipo Switch (Toggle) emparejado con un título "Sincronización en la Nube" y un subtítulo
  explicativo ("Mantén tus perfiles seguros en todos tus dispositivos").
* **Estados:**
    * *Active:* Switch a la derecha, fondo `bg-indigo-600`.
    * *Inactive:* Switch a la izquierda, fondo `bg-zinc-300`.
    * *Disabled/Loading:* Opacidad reducida `opacity-50`, cursor `cursor-not-allowed`.

#### `VersionHistoryItem`

* **Propósito:** Tarjeta individual dentro de la línea de tiempo del prompt (HU-04, HU-05).
* **Props:** `versionId` (string), `timestamp` (Date), `excerpt` (string - fragmento del prompt), `isCurrent` (boolean),
  `onRestore` (function).
* **Estados & Estilos:**
    * *Normal:* Contenedor con borde izquierdo alineado al `TimelineDot`. Texto de fecha `text-xs text-zinc-500`.
      Fragmento truncado del texto.
    * *Hover:* Fondo sutil `bg-zinc-50`. Aparece el botón de acción rápida "Restaurar" (Button variant 'ghost', size '
      sm').
    * *Focus:* `ring-2 ring-indigo-500` para accesibilidad por teclado.

### 4.3. Organismos

#### `CloudAuthModal`

* **Propósito:** Flujo de inicio de sesión y configuración inicial.
* **Estructura:** Contenedor modal centrado (`role="dialog"`). Logo de la extensión, propuesta de valor ilustrada ("
  Lleva tus prompts a todas partes"), Botones de autenticación (Ej. "Continuar con Google" o Email), y el
  `SyncToggleSwitch`.
* **Estados Interactivos:**
    * *Loading:* Muestra un Spinner durante la validación del token y sincronización inicial de la base de datos Dexie
      con la nube.
    * *Error:* Snackbar interno notificando fallos de red.

#### `TimeMachinePanel` (Versionado)

* **Propósito:** Visualizar e interactuar con el historial completo de un perfil específico.
* **Estructura:**
    * *Header:* Título "Historial de Versiones" y botón de cierre ("X").
    * *Body:* Contenedor con scroll vertical (`overflow-y-auto`) mapeando una lista de `VersionHistoryItem`.
* **Interacción (HU-05):** Al hacer clic en "Restaurar" en un ítem, se dispara un modal de confirmación rápida o se
  restaura instantáneamente lanzando un `ToastNotification` ("Versión de [Fecha] restaurada") con un botón de "
  Deshacer" (Undo) por si fue accidental.

## 5. Especificaciones de Accesibilidad (WCAG AA)

Dado el nivel de herramientas profesionales de la audiencia, la accesibilidad de las nuevas funciones es crítica:

1. **Retroalimentación No Visual (Screen Readers):**
    * El estado de sincronización es dinámico y en segundo plano. Cuando el estado cambie de "Offline" a "Sincronizado",
      no se debe interrumpir al usuario, pero se debe usar una región viva invisible:
      `<div aria-live="polite" class="sr-only">Sincronización completada</div>`.
    * El `SyncStatusIcon` debe tener un atributo `role="status"` y un `aria-label` descriptivo estricto que cambie
      dinámicamente (ej. `aria-label="Estado de nube: Desconectado. Cambios guardados localmente."`).
2. **Navegación por Teclado en el Historial:**
    * El `TimeMachinePanel` debe ser completamente navegable mediante `Tab`.
    * Los botones de "Restaurar" que solo aparecen en *Hover* visualmente, deben volverse visibles y recibir foco real (
      con `ring-2 ring-offset-2 ring-indigo-500`) cuando el usuario navegue con la tecla Tabulador.
3. **Gestión de Foco (Focus Trapping):**
    * Al abrir el `CloudAuthModal` o el `TimeMachinePanel`, el foco del teclado debe saltar automáticamente al primer
      elemento interactivo dentro del panel.
    * Al cerrarlos (con tecla `Esc` o botón de cierre), el foco debe retornar al botón exacto que originó la apertura
      del panel, evitando que los usuarios pierdan su lugar en la interfaz.
4. **Resiliencia Cognitiva y Prevención de Errores:**
    * La acción de "Restaurar" un perfil antiguo sobrescribe el actual. Para evitar estrés, la plataforma tratará esta "
      sobrescritura" creando una *nueva* versión del estado justo antes de restaurar. Así, el usuario siempre puede
      deshacer una restauración errónea navegando de nuevo al historial.