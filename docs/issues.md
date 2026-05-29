# Documento de Tareas: `issues.md`

## Milestone 1: Infraestructura Core y Configuración

### Issue #1: [Infraestructura] - Inicialización del Proyecto y Setup de Tailwind CSS v4
**Tipo:** Frontend
**Dependencias:** Ninguna

**Descripción:**
Configurar el entorno de desarrollo base para la extensión de navegador (Manifest V3) e integrar **Tailwind CSS v4**.
Debe sentar las bases para la paleta semántica (Indigo, Zinc, Emerald, Amber, Red) directamente desde CSS. Se busca
minimizar las dependencias y asegurar que la extensión sea ligera y rápida.

**Criterios de Aceptación:**

- [ ] **Dado que** inicio el entorno de desarrollo, **Cuando** compilo el proyecto, **Entonces** se debe generar un
  `manifest.json` válido para MV3 y los archivos estáticos básicos.
- [ ] **Dado que** aplico clases de Tailwind, **Cuando** renderizo una vista de prueba, **Entonces** los estilos se
  aplican sin errores y reflejan la paleta del `design.md`.

**Notas Técnicas:**

- **Tailwind v4:** No crees un archivo `tailwind.config.js`. Utiliza un archivo principal CSS (ej. `global.css`) e
  incluye `@import "tailwindcss";`. Define las variables de color extendidas usando la directiva
  `@theme { --color-indigo-600: #...; }` según la documentación oficial de v4.
- Utiliza Vite (con `@tailwindcss/vite`) u otra herramienta de empaquetado moderna para procesar el CSS y generar los
  assets para la extensión.

---

### Issue #2: [Base de Datos] - Configuración de IndexedDB con Dexie.js
**Tipo:** Base de Datos
**Dependencias:** Ninguna

**Descripción:**
Inicializar la base de datos local `ContextOrchestratorDB` utilizando la versión más reciente de Dexie.js (v4+) para
manejar la persistencia offline. Crear las colecciones preparadas para sincronización (Soft Deletes, control de
versiones).

**Criterios de Aceptación:**

- [ ] **Dado que** la extensión se instala, **Cuando** el Service Worker arranca, **Entonces** se debe instanciar la
  base de datos versión 1 con las tablas `profiles` y `recovery_history`.
- [ ] **Dado que** inserto un registro en `profiles`, **Entonces** debe aceptar un `id` UUID v4 y permitir búsquedas por
  los índices `*tags` y `last_used_at`.

**Notas Técnicas:**

- Esquema de Dexie: `profiles: 'id, name, *tags, updated_at, deleted_at, usage_count, last_used_at'` y
  `recovery_history: '++id, timestamp, target_url'`.
- **Mejor Práctica:** Para la generación de UUIDs, NO instales la librería `uuid`. Utiliza la API nativa del navegador
  `crypto.randomUUID()`, la cual es estándar en entornos de Service Worker y navegadores modernos, reduciendo el tamaño
  del bundle.

---

### Issue #3: [Integración] - Bus de Mensajes en el Service Worker (Background)

**Tipo:** Backend Local
**Dependencias:** Issue #2

**Descripción:**
Crear el enrutador central en el Service Worker (`background.js`) para aislar la lógica de negocio. Recibirá mensajes
estructurados (Action/Payload) y orquestará llamadas a la base de datos.

**Criterios de Aceptación:**

- [ ] **Dado que** un script cliente envía `{ action: "PING" }`, **Cuando** el SW lo recibe, **Entonces** debe responder
  con `{ status: "ok" }`.
- [ ] **Dado que** se envían múltiples peticiones concurrentes, **Entonces** el Service Worker no debe bloquearse y debe
  manejar las promesas correctamente, retornando respuestas asíncronas de forma estable.

**Notas Técnicas:**

- Para peticiones asíncronas en `chrome.runtime.onMessage` (MV3), es obligatorio retornar `true` sincrónicamente desde
  el listener para indicar al navegador que usarás `sendResponse` de forma asíncrona tras resolver tu Promesa. Retorna
  siempre una estructura estándar: `{ status: "ok"|"error", data?: any, message?: string }`.

---

## Milestone 2: Sistema de Diseño y UI Base

### Issue #4: [UI Core] - Implementación de Átomos (Button, Input, Textarea, Tag)
**Tipo:** Frontend
**Dependencias:** Issue #1

**Descripción:**
Construir los componentes reactivos (Átomos) detallados en el `design.md`. Deben cumplir rigurosamente con las
directrices de accesibilidad (WCAG AA).

**Criterios de Aceptación:**

- [ ] **Dado que** uso el `Button` con `isLoading=true`, **Entonces** se deshabilita visualmente (sin cambiar
  tamaño/layout) y muestra un Spinner nativo accesible.
- [ ] **Dado que** navego con teclado, **Cuando** un elemento interactivo recibe el foco, **Entonces** debe mostrar un
  anillo visible de alto contraste (`ring-2 ring-indigo-500`).
- [ ] **Dado que** ocurre un error, **Entonces** el `Input` o `Textarea` debe usar el atributo `aria-invalid="true"`.

**Notas Técnicas:**

- **Mejor Práctica Tailwind:** Utiliza `tailwind-merge` y `clsx` (o `clsx` nativo) para la composición dinámica de
  clases pasadas por props (`className`), evitando conflictos de precedencia comunes al sobreescribir estilos base en
  componentes reutilizables.

---

### Issue #5: [UI Core] - Implementación de Moléculas (ProfileCard y ToastNotification)
**Tipo:** Frontend
**Dependencias:** Issue #4

**Descripción:**
Componer átomos para crear tarjetas de perfiles interactivas y el gestor de notificaciones globales (Toasts).

**Criterios de Aceptación:**

- [ ] **Dado que** navego con teclado sobre el `ProfileCard`, **Cuando** hago focus en él, **Entonces** el botón "
  Aplicar" oculto se hace visible (manejo de estado `focus-within`).
- [ ] **Dado que** se dispara un `ToastNotification` de error crítico, **Entonces** debe estar inyectado en un
  contenedor con `aria-live="assertive"`.

**Notas Técnicas:**

- El sistema de Toasts debe gestionarse desde el contexto superior (ej. React Context, Zustand o eventos nativos custom)
  para asegurar un solo punto de montaje en el DOM.

---

## Milestone 3: Gestión de Perfiles (HU01)

### Issue #6: [Perfiles] - Controladores CRUD en Service Worker
**Tipo:** Backend Local
**Dependencias:** Issue #2, Issue #3

**Descripción:**
Implementar la lógica transaccional de los endpoints locales (`GET_PROFILES`, `SAVE_PROFILE`, `DELETE_PROFILE`,
`LOG_USAGE`).

**Criterios de Aceptación:**

- [ ] **Dado que** ejecuto `SAVE_PROFILE` sin ID, **Entonces** se usa `crypto.randomUUID()`, `usage_count` inicia en 0 y
  `updated_at` recibe `Date.now()`.
- [ ] **Dado que** ejecuto `DELETE_PROFILE`, **Entonces** se ejecuta un soft-delete (se añade `deleted_at`) en vez de un
  borrado destructivo.
- [ ] **Dado que** ejecuto `GET_PROFILES`, **Entonces** retorna únicamente los registros con `deleted_at == null` (a
  menos que se pase un flag explícito para sincronización).

**Notas Técnicas:**

- Aislar esta lógica en archivos separados importados al `background.js` principal para mantener el código limpio.

---

### Issue #7: [Perfiles] - Interfaz ProfileManagerModal
**Tipo:** Frontend
**Dependencias:** Issue #4, Issue #6

**Descripción:**
Crear el formulario modal para creación/edición de perfiles, incluyendo validación de estado "dirty" (cambios no
guardados).

**Criterios de Aceptación:**

- [ ] **Dado que** hay cambios no guardados en el formulario, **Cuando** intento cerrar el modal (clic fuera o escape),
  **Entonces** se muestra una confirmación impidiendo la pérdida accidental de datos.
- [ ] **Dado que** se abre el modal, **Entonces** el foco del teclado queda confinado dentro del modal (Focus Trap).

**Notas Técnicas:**

- **Mejor Práctica de Accesibilidad:** NO construyas el Focus Trap a mano con `divs`. Utiliza el elemento nativo HTML5
  `<dialog>` con su método `showModal()`. El navegador gestionará el backdrop, el aislamiento de fondo y el atrapado del
  foco de forma nativa e impecable.

---

### Issue #8: [Perfiles] - Pantalla Principal de Dashboard

**Tipo:** Frontend
**Dependencias:** Issue #5, Issue #7

**Descripción:**
Ensamblar la pantalla principal (Extension Popup) con búsqueda reactiva, renderizado de perfiles y navegación.

**Criterios de Aceptación:**

- [ ] **Dado que** abro la extensión, **Entonces** la lista muestra los perfiles ordenados por los más
  recientes/usados (`last_used_at`, `usage_count`).
- [ ] **Dado que** escribo en el buscador superior, **Entonces** la lista se filtra en tiempo real evaluando el texto
  ingresado contra el `name`, el `content` y los `tags`.

**Notas Técnicas:**

- Utiliza `useLiveQuery` de Dexie (si usas React) o una arquitectura reactiva similar para que el listado de UI se
  refresque automáticamente cada vez que el Service Worker modifique un registro de perfiles, evitando llamadas de
  refresco manuales.

---

## Milestone 4: Inyección y Asistente Contextual (HU02, HU06, HU07)

### Issue #9: [Inyección] - Detección Adaptativa en Google AI Studio (HU07)
**Tipo:** Frontend / Content Script
**Dependencias:** Ninguna

**Descripción:**
Crear un Content Script (`content.js`) para rastrear semánticamente el `textarea` destino en las plataformas de IA, sin
depender de clases CSS volátiles.

**Criterios de Aceptación:**

- [ ] **Dado que** estoy en la página destino, **Cuando** el Content Script se ejecuta, **Entonces** usa selectores
  estables (ej. `role="textbox"`, `aria-label`, o `contenteditable="true"`) para enganchar el campo.
- [ ] **Dado que** la UI cambia dinámicamente mediante SPA routing, **Entonces** un `MutationObserver` detecta y
  reasigna el campo correctamente.

**Notas Técnicas:**

- Riesgo alto: Mantener esta lógica altamente modularizada. Crear una capa de abstracción `PlatformDetector` que
  determine qué reglas (selectores de atributo) usar según el `window.location.hostname`.

---

### Issue #10: [Inyección] - Implementación de ContextualWidget (HU06)
**Tipo:** Frontend / Content Script
**Dependencias:** Issue #4, Issue #9

**Descripción:**
Inyectar un widget flotante sutil (botón + popover) junto al `textarea` detectado, para selección rápida de perfiles.

**Criterios de Aceptación:**

- [ ] **Dado que** paso el mouse sobre la zona, **Entonces** la opacidad del botón flotante cambia de sutil (40%) a
  visible (100%).
- [ ] **Dado que** el usuario hace clic en el botón, **Entonces** se despliega una mini-lista con los 3 perfiles más
  usados.

**Notas Técnicas:**

- **Crítico para Tailwind v4:** Debido a que el componente se inyecta en un **ShadowRoot** (para evitar que la página
  huésped rompa nuestros estilos), **debes asegurar que el archivo CSS compilado de Tailwind se inyecte también dentro
  del tag `<style>` del Shadow DOM**. Si omites esto, el widget flotante carecerá de estilos y Tailwind no podrá actuar
  sobre el contenido encapsulado.

---

### Issue #11: [Inyección] - Motor de Inyección de Texto y Flujo (HU02)
**Tipo:** Integración
**Dependencias:** Issue #8, Issue #9, Issue #10

**Descripción:**
Aplicar el perfil en el `textarea`, despachar eventos sintéticos para que los frameworks modernos (React/Angular en la
página huésped) detecten los cambios, y registrar el uso (`LOG_USAGE`).

**Criterios de Aceptación:**

- [ ] **Dado que** elijo aplicar un perfil, **Cuando** se inyecta, **Entonces** el valor del área destino cambia y se
  despachan eventos DOM nativos (`input`, `change`, `blur`) necesarios.
- [ ] **Dado que** el texto se inyectó, **Entonces** se muestra un Toast verde en la pantalla huésped.

**Notas Técnicas:**

- Muchos frameworks interceptan setters nativos de `value`. Para inyectar texto fiablemente en un SPA moderno, necesitas
  sobreescribir el `prototype setter` de HTMLInputElement/HTMLTextAreaElement antes de despachar el evento
  `Event('input', { bubbles: true })`.

---

## Milestone 5: Red de Seguridad y Autoguardado (HU03)

### Issue #12: [Seguridad] - Interceptor de Textos Huérfanos
**Tipo:** Backend Local / Content Script
**Dependencias:** Issue #11

**Descripción:**
Antes de inyectar un nuevo texto sobreescribiendo uno existente, leer el valor actual del campo, y si fue escrito
manualmente por el usuario y no es nulo, guardarlo en `recovery_history`.

**Criterios de Aceptación:**

- [ ] **Dado que** he escrito algo en el prompt, **Cuando** aplico un perfil, **Entonces** ese texto se envía al Service
  Worker (mediante `BACKUP_ORPHAN_TEXT`) antes del reemplazo.
- [ ] **Dado que** se realiza el backup, **Entonces** el Toast cambia a un aviso de prevención ("Texto anterior
  respaldado", color Ámbar).

**Notas Técnicas:**

- Añadir un trabajo de limpieza al inicio del SW: ejecutar una purga para borrar registros de `recovery_history` donde
  `timestamp` < (Date.now() - 30 días) para optimización de cuota IndexedDB.

---

### Issue #13: [Seguridad] - Interfaz RecoveryHistoryPanel
**Tipo:** Frontend
**Dependencias:** Issue #5, Issue #12

**Descripción:**
Crear la vista cronológica (timeline) para mostrar, visualizar o copiar al portapapeles los fragmentos recuperados.

**Criterios de Aceptación:**

- [ ] **Dado que** veo el historial, **Entonces** observo tiempo relativo ("Hace 10 minutos"), y el origen exacto (
  `target_url`).
- [ ] **Dado que** doy clic en "Copiar", **Entonces** el texto se copia al portapapeles del SO.

**Notas Técnicas:**

- Usar la API asíncrona moderna `navigator.clipboard.writeText()`. Manejar errores apropiadamente en caso de que el
  entorno no disponga de contexto seguro (`https`).

---

## Milestone 6: Portabilidad de Datos (HU05)

### Issue #14: [Portabilidad] - Motor de Exportación e Importación de JSON

**Tipo:** Backend Local
**Dependencias:** Issue #6

**Descripción:**
Lógica en el Service Worker para el Dump (volcado) completo de los datos base a formato stringificado y viceversa.

**Criterios de Aceptación:**

- [ ] **Dado que** se invoca la exportación, **Entonces** retorna un objeto JSON masivo excluyendo registros "hard"
  eliminados.
- [ ] **Dado que** se envía un JSON para importar, **Entonces** el SW hace "Upsert" (Merge), respetando el registro que
  tenga el `updated_at` más reciente si hay conflicto de UUID.

**Notas Técnicas:**

- Es obligatorio implementar validación de esquema en la importación (usando librerías ligeras como Zod, Superstruct o
  checks manuales seguros) para evitar inyección de JSONs corruptos que destruyan el DB.

---

### Issue #15: [Portabilidad] - UI de Portabilidad en Configuración
**Tipo:** Frontend
**Dependencias:** Issue #14

**Descripción:**
Integrar los botones y lógica de "Exportar JSON" e "Importar Biblioteca" en la pestaña de Configuración.

**Criterios de Aceptación:**

- [ ] **Dado que** clic en Exportar, **Entonces** el sistema orquesta la descarga nativa de un archivo
  `context_backup_YYYYMMDD.json`.
- [ ] **Dado que** selecciono importar archivo, **Entonces** se muestran estados de carga y finalmente un Toast del
  resultado (Ej. "10 perfiles añadidos").

**Notas Técnicas:**

- Para exportar datos desde el cliente sin servidor, crea un `Blob` a partir de la respuesta JSON del SW, pásalo por
  `URL.createObjectURL(blob)`, aplícalo a un `<a>` oculto, dispara `.click()` dinámicamente y llama inmediatamente a
  `URL.revokeObjectURL()` para no causar fugas de memoria.