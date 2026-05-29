**Nota Arquitectónica inicial:** Dado que el proyecto inicia desde cero, se ha adoptado **Tailwind CSS** como framework
estándar para la implementación. Se ha diseñado un sistema visual con una paleta de colores neutral y moderna por
defecto para garantizar una integración sin fricción con interfaces de IA de terceros. Se han añadido proactivamente
estados de *Carga (Loading)* y *Notificación (Snackbars)* para manejar el feedback del sistema.

## 1. Resumen de la Experiencia (UX)

La experiencia de usuario está diseñada bajo los principios de **"Carga Cognitiva Cero"** y **"Flujo Ininterrumpido"**.
La interfaz operará principalmente como un panel flotante o barra lateral (Sidebar/Extension Popup) complementada por
elementos inyectados en el DOM (Asistente Contextual).

La estética es minimalista, dando prioridad al contenido (los perfiles y textos). Las microinteracciones juegan un papel
crucial: el sistema siempre informará al usuario sobre lo que está sucediendo (ej. "Perfil aplicado con éxito" o "Texto
anterior respaldado") para construir una confianza absoluta en la "Red de Seguridad".

## 2. Flujo de Navegación

El diseño es "Mobile-First" adaptativo, aunque el contexto de uso principal es en plataformas de escritorio.

* **Pantalla Principal (Dashboard/Lista):**
    * Barra de búsqueda superior (Filtro por texto y tags).
    * Lista de tarjetas de perfiles (Scrollable).
    * Botón de Acción Principal (FAB o botón de encabezado) para "Nuevo Perfil".
    * Menú inferior o superior para navegación secundaria: *Historial de Recuperación* y *Configuración*.
* **Modal/Pantalla de Creación/Edición de Perfil:**
    * Formulario: Nombre, Instrucciones (Textarea expandible), Selector de Etiquetas.
    * Acciones: Guardar, Cancelar.
* **Pantalla de Historial de Recuperación (Red de Seguridad):**
    * Lista cronológica de textos guardados automáticamente.
    * Acciones por ítem: "Copiar al portapapeles", "Restaurar".
* **Asistente Contextual (UI Superpuesta en la plataforma IA):**
    * Botón flotante sutil (opacidad baja, se activa en *Hover*) cerca del área de input de la IA.
    * Al hacer clic: Menú desplegable rápido (Drop-up) con los perfiles más usados.

## 3. Sistema de Diseño y Estilos (Tailwind CSS)

* **Tipografía:** `font-sans` (Inter o Roboto). Tamaños legibles (`text-sm` para descripciones, `text-base` general).
* **Paleta de Colores (Variables semánticas):**
    * *Primary (Acentos y acciones):* Indigo (`bg-indigo-600`, hover: `bg-indigo-700`).
    * *Background (Fondos):* Zinc (`bg-zinc-50` para fondo principal, `bg-white` para tarjetas/paneles). Dark mode:
      `bg-zinc-900`.
    * *Text (Tipografía):* `text-zinc-900` (Títulos), `text-zinc-500` (Secundario/Placeholder).
    * *Success (Feedback):* Emerald (`text-emerald-600`, `bg-emerald-50`).
    * *Warning/Safety Net:* Amber (`text-amber-600`, `bg-amber-50`).
    * *Error:* Red (`text-red-600`, `ring-red-500`).
* **Bordes y Sombras:** Uso extensivo de `rounded-lg` o `rounded-xl` para un aspecto moderno y amigable. Sombras suaves
  `shadow-sm` para tarjetas, `shadow-lg` para modales y widgets flotantes.

## 4. Arquitectura de Componentes (UI)

### 4.1. Átomos

#### `Button`

* **Propósito:** Elemento de acción universal.
* **Props:** `variant` ('primary' | 'secondary' | 'ghost'), `size` ('sm' | 'md' | 'lg'), `isLoading` (boolean),
  `isDisabled` (boolean), `icon` (ReactNode).
* **Estados:**
    * *Normal:* `bg-indigo-600 text-white rounded-md transition-all`.
    * *Hover:* `bg-indigo-700 shadow-md transform -translate-y-px`.
    * *Focus:* `outline-none ring-2 ring-indigo-500 ring-offset-2`.
    * *Active:* `scale-95 bg-indigo-800`.
    * *Disabled:* `opacity-50 cursor-not-allowed bg-zinc-300 text-zinc-500`.
    * *Loading:* Deshabilitado visualmente, reemplaza el ícono con un `Spinner` giratorio. Texto: "Aplicando...".

#### `Input` & `Textarea`

* **Propósito:** Captura de texto para nombres de perfil e instrucciones.
* **Props:** `value`, `onChange`, `placeholder`, `isInvalid` (boolean), `errorMessage` (string).
* **Estados:**
    * *Normal:* `border border-zinc-300 rounded-md bg-white text-zinc-900`.
    * *Hover:* `border-zinc-400`.
    * *Focus:* `ring-2 ring-indigo-500 border-indigo-500 outline-none`.
    * *Error:* `ring-2 ring-red-500 border-red-500`. El texto del error debe aparecer abajo en `text-xs text-red-600`.

#### `Tag (Badge)`

* **Propósito:** Categorización visual de los perfiles.
* **Props:** `label` (string), `color` (string - opcional), `onRemove` (function - opcional para modo edición).
* **Estilo Base:**
  `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800`.

### 4.2. Moléculas

#### `ProfileCard`

* **Propósito:** Mostrar un perfil en la lista principal.
* **Estructura:** Contenedor `div`, Título (h3), Lista de `Tag`s, Botón "Aplicar" oculto/sutil hasta hacer hover.
* **Props:** `profile` (Object), `onApply` (function), `onEdit` (function).
* **Estados:**
    * *Normal:* Fondo blanco, borde ligero `border-zinc-200`.
    * *Hover:* `border-indigo-300 shadow-sm cursor-pointer`. Aparece el botón de acción rápida "Aplicar".
    * *Focus-within:* Asegura que al navegar con teclado (`Tab`), el botón de aplicar reciba el `ring-2`.

#### `ToastNotification`

* **Propósito:** Feedback no bloqueante.
* **Estructura:** Icono (Éxito/Alerta/Error), Mensaje de texto, Botón de cerrar o de acción (Ej: "Deshacer").
* **Casos de uso críticos:**
    * "Perfil aplicado con éxito" (Verde).
    * "Texto anterior guardado en el Historial" (Ámbar, con botón que lleva al historial).

### 4.3. Organismos

#### `ProfileManagerModal` (HU01)

* **Propósito:** Formulario completo para crear/editar.
* **Estados de interacción:**
    * Si el usuario intenta cerrar con cambios sin guardar (estado *dirty*), se muestra una advertencia (Alerta de
      abandono).
    * Estado de *Loading* explícito al guardar en la nube (Sincronización - HU04).

#### `ContextualWidget` (HU06)

* **Propósito:** Botón flotante renderizado sobre la UI de la plataforma IA.
* **Comportamiento adaptativo:** Se posiciona dinámicamente encima del `textarea` detectado.
* **Estados:**
    * *Normal:* Botón circular sutil (Ej: Icono de un rayo), `opacity-40 bg-zinc-800 text-white`.
    * *Hover:* `opacity-100 scale-110 transition-transform`.
    * *Expanded (Active):* Abre un pequeño menú emergente (`Popover`) con los 3 perfiles más usados y una barra de
      búsqueda rápida.

#### `RecoveryHistoryPanel` (HU03)

* **Propósito:** Interfaz de la red de seguridad.
* **Estructura:** Lista tipo *timeline* de textos huérfanos. Muestra un fragmento (truncado) del texto, la fecha/hora
  relativa (ej. "Hace 5 min"), y botones de acción ("Copiar", "Ver todo").

## 5. Especificaciones de Accesibilidad (WCAG AA)

Para asegurar la usabilidad universal, todos los componentes deben integrarse de forma nativa con los siguientes
principios:

1. **Navegación por Teclado:**
    * Todos los elementos interactivos (`Button`, `ProfileCard`, `Input`, `ContextualWidget`) deben tener un
      `tabindex="0"` u orden de tabulación lógico.
    * El flujo debe atrapar el foco (*Focus Trap*) cuando un modal o el menú contextual esté abierto, impidiendo que el
      usuario navegue accidentalmente por el fondo oscuro.
2. **Etiquetas ARIA (Aria-labels y Roles):**
    * Botones sin texto (solo íconos) deben tener un atributo `aria-label` descriptivo (ej.
      `aria-label="Aplicar perfil Técnico"`).
    * Los modales deben utilizar `role="dialog"` y `aria-modal="true"`.
    * Los mensajes de error en formularios y los Toasts de notificaciones deben usar `aria-live="polite"` (para feedback
      general) o `aria-live="assertive"` (para errores críticos de red o guardado) para que los lectores de pantalla los
      anuncien inmediatamente.
3. **Contraste de Color:**
    * Se debe garantizar un ratio de contraste mínimo de 4.5:1 para texto normal y 3:1 para texto grande. (La paleta
      propuesta de Indigo-600 sobre blanco y Zinc-900 sobre Zinc-50 cumple con esta métrica).
    * El estado `Focus` nunca debe depender exclusivamente del color. Se utilizará siempre un anillo visible (
      `ring-2 ring-offset-2`) para indicar el elemento activo.
4. **Resiliencia frente a cambios de UI (HU07):**
    * Para la inyección de contexto, la selección semántica del `textarea` destino debe basarse en roles (
      `role="textbox"`), atributos (`contenteditable="true"`) y heurísticas (ej. posición en el layout), garantizando
      que el widget contextual y el botón "Aplicar" funcionen incluso si la plataforma IA cambia los nombres de sus
      clases CSS.