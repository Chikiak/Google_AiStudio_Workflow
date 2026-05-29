# Documento de Tareas: `issues.md`

## Milestone 1: Infraestructura Core y Configuración

### Issue #1: [Infraestructura] - Inicialización del Proyecto y Setup de Tailwind CSS

**Tipo:** Frontend
**Dependencias:** Ninguna

**Descripción:**
Configurar el entorno de desarrollo base para la extensión de navegador (Manifest V3). Implementar Tailwind CSS con la
paleta de colores semántica especificada (Indigo, Zinc, Emerald, Amber, Red) y tipografía Sans (Inter/Roboto) para
garantizar el enfoque minimalista y de "Carga Cognitiva Cero".

**Criterios de Aceptación:**

- [ ] **Dado que** inicio el entorno de desarrollo, **Cuando** compilo el proyecto, **Entonces** se debe generar un
  `manifest.json` válido para MV3 y los archivos estáticos básicos.
- [ ] **Dado que** aplico clases de Tailwind, **Cuando** renderizo una vista de prueba, **Entonces** las variables de
  color personalizadas (`bg-zinc-50`, `text-indigo-600`, etc.) deben aplicarse correctamente según el `design.md`.

**Notas Técnicas:**
Configurar PostCSS y el archivo `tailwind.config.js` extendiendo el `theme.colors` para incluir los valores semánticos
exactos indicados en el documento de diseño visual.

---

### Issue #2: [Base de Datos] - Configuración de IndexedDB con Dexie.js y Esquemas

**Tipo:** Base de Datos
**Dependencias:** Ninguna

**Descripción:**
Inicializar la base de datos local `ContextOrchestratorDB` utilizando Dexie.js para manejar la persistencia offline.
Crear las colecciones `profiles` y `recovery_history` con los índices necesarios para búsquedas rápidas, preparando la
estructura (UUIDs, `updated_at`, `deleted_at`) para una futura sincronización en la nube.

**Criterios de Aceptación:**

- [ ] **Dado que** la extensión se instala, **Cuando** el Service Worker arranca, **Entonces** se debe instanciar la
  base de datos versión 1 con las tablas `profiles` y `recovery_history`.
- [ ] **Dado que** inserto un registro en `profiles`, **Entonces** debe aceptar un `id` UUID v4 generado en el cliente,
  y permitir búsquedas por los índices `*tags` y `last_used_at`.

**Notas Técnicas:**
Utilizar la librería `uuid` (v4). El esquema de Dexie debe ser exactamente:
`profiles: 'id, name, *tags, updated_at, deleted_at, usage_count, last_used_at'`
`recovery_history: '++id, timestamp, target_url'`

---

### Issue #3: [Integración] - Implementación del Bus de Mensajes en Service Worker

**Tipo:** Integración / Backend Local
**Dependencias:** Issue #2

**Descripción:**
Crear el enrutador central en el Service Worker (`background.js`) que actuará como backend local. Debe recibir mensajes
estructurados desde el Popup o los Content Scripts mediante `chrome.runtime.onMessage` y rutear las peticiones a los
controladores de base de datos adecuados basándose en la propiedad `action`.

**Criterios de Aceptación:**

- [ ] **Dado que** un script cliente envía un mensaje `{ action: "PING" }`, **Cuando** el Service Worker lo recibe, *
  *Entonces** debe responder con un `{ status: "ok" }`.
- [ ] **Dado que** el listener está activo, **Cuando** se ejecuta una acción asíncrona (como consultas a Dexie), *
  *Entonces** debe retornar `true` en el listener para mantener el canal de mensajes abierto hasta enviar la respuesta.

**Notas Técnicas:**
Implementar un `switch` o mapa de controladores para las acciones requeridas (`GET_PROFILES`, `SAVE_PROFILE`,
`DELETE_PROFILE`, etc.). Retornar una estructura estandarizada `{ status: "ok"|"error", data: any, message?: string }`.

---

## Milestone 2: Sistema de Diseño y UI Base

### Issue #4: [UI Core] - Implementación de Átomos (Button, Input, Textarea, Tag)

**Tipo:** Frontend
**Dependencias:** Issue #1

**Descripción:**
Construir los componentes reactivos/DOM puros (Átomos) detallados en la arquitectura de componentes UI. Deben cumplir
con las pautas de accesibilidad (WCAG AA), incluyendo estados de focus (anillos visibles) y gestión de roles ARIA.

**Criterios de Aceptación:**

- [ ] **Dado que** uso el componente `Button`, **Cuando** cambio su prop `isLoading` a `true`, **Entonces** se
  deshabilita visualmente y muestra un Spinner giratorio.
- [ ] **Dado que** navego con teclado, **Cuando** un `Input` o `Button` recibe el foco, **Entonces** debe mostrar un
  anillo visible (`ring-2 ring-indigo-500`).
- [ ] **Dado que** ocurre un error de validación, **Cuando** el `Input` recibe `isInvalid=true`, **Entonces** su borde
  debe ser rojo (`border-red-500`) y debe usar `aria-invalid="true"`.

**Notas Técnicas:**
Crear componentes reutilizables. El componente `Tag` debe incluir la capacidad opcional de tener un botón "x" para ser
removido durante la edición (`onRemove`).

---

### Issue #5: [UI Core] - Implementación de Moléculas (ProfileCard y ToastNotification)

**Tipo:** Frontend
**Dependencias:** Issue #4

**Descripción:**
Agrupar los átomos desarrollados para crear las tarjetas de lista de perfiles y el sistema global de notificaciones (
Toasts) para feedback del usuario.

**Criterios de Aceptación:**

- [ ] **Dado que** visualizo un `ProfileCard`, **Cuando** hago hover sobre la tarjeta, **Entonces** el botón "Aplicar"
  oculto debe aparecer suavemente (fade-in).
- [ ] **Dado que** la aplicación dispara un `ToastNotification` de error, **Entonces** debe usar `aria-live="assertive"`
  para que el lector de pantalla lo anuncie de inmediato.

**Notas Técnicas:**
El `ToastNotification` debe manejar auto-desmontaje (timeout de ~3-5 segundos) a menos que sea de tipo interactivo (ej.
con botón "Deshacer").

---

## Milestone 3: Gestión de Perfiles (HU01)

### Issue #6: [Perfiles] - Controladores CRUD en Service Worker

**Tipo:** Backend Local
**Dependencias:** Issue #2, Issue #3

**Descripción:**
Implementar la lógica transaccional real para `GET_PROFILES`, `SAVE_PROFILE`, `DELETE_PROFILE` y `LOG_USAGE` dentro del
Service Worker interactuando con Dexie.js.

**Criterios de Aceptación:**

- [ ] **Dado que** ejecuto `SAVE_PROFILE` sin un ID, **Cuando** se procesa, **Entonces** se genera un UUID, inicializa
  `usage_count` en 0, asigna `updated_at` a la fecha actual y guarda el registro.
- [ ] **Dado que** ejecuto `DELETE_PROFILE`, **Cuando** se procesa, **Entonces** no se elimina el registro (Hard
  delete), sino que se actualiza el campo `deleted_at` (Soft delete) con la fecha actual.
- [ ] **Dado que** ejecuto `GET_PROFILES`, **Entonces** solo debe devolver registros donde `deleted_at` sea nulo,
  permitiendo filtrado opcional por el array de `tags`.

**Notas Técnicas:**
`LOG_USAGE` debe hacer un update atómico incrementando `usage_count` en +1 y actualizando `last_used_at`.

---

### Issue #7: [Perfiles] - Interfaz ProfileManagerModal

**Tipo:** Frontend
**Dependencias:** Issue #4, Issue #6

**Descripción:**
Construir el formulario complejo (Modal) para crear y editar perfiles. Debe manejar validación del estado *dirty* para
advertir sobre cierre accidental con cambios no guardados.

**Criterios de Aceptación:**

- [ ] **Dado que** estoy escribiendo en el modal, **Cuando** intento cerrarlo o hacer clic en el backdrop oscuro, *
  *Entonces** se me debe mostrar un `alert` o advertencia impidiendo el cierre accidental.
- [ ] **Dado que** abro el modal, **Cuando** navego con `Tab`, **Entonces** el foco debe quedar atrapado (*Focus Trap*)
  dentro de los límites del modal.

**Notas Técnicas:**
Debe comunicarse con el SW vía `SAVE_PROFILE`. Incluir selector o input dinámico para agregar/eliminar items del array
de `tags`.

---

### Issue #8: [Perfiles] - Pantalla Principal de Dashboard

**Tipo:** Frontend / Integración
**Dependencias:** Issue #5, Issue #7

**Descripción:**
Ensamblar la pantalla principal (Extension Popup) con la barra de búsqueda, la lista scrollable de `ProfileCard`s
cargados desde la base de datos, y los accesos para "Nuevo Perfil" e "Historial".

**Criterios de Aceptación:**

- [ ] **Dado que** abro la extensión, **Cuando** carga la pantalla principal, **Entonces** debe mostrar los perfiles
  ordenados por los más usados/recientes solicitando los datos mediante `GET_PROFILES`.
- [ ] **Dado que** escribo en la barra de búsqueda, **Cuando** tecleo un tag o texto, **Entonces** la lista debe
  filtrarse reactivamente en tiempo real.

**Notas Técnicas:**
Asegurar que la lista de tarjetas pueda manejar un alto volumen de items con un scroll nativo suave.

---

## Milestone 4: Inyección y Asistente Contextual (HU02, HU06, HU07)

### Issue #9: [Inyección] - Detección Adaptativa en Google AI Studio (HU07)

**Tipo:** Frontend / Content Script
**Dependencias:** Ninguna

**Descripción:**
Crear un Content Script (`content.js`) especializado en observar el DOM de Google AI Studio e identificar el área de
texto objetivo (System Instructions / Prompt textarea) utilizando selectores semánticos en lugar de clases CSS
volátiles.

**Criterios de Aceptación:**

- [ ] **Dado que** estoy en Google AI Studio, **Cuando** el Content Script se carga, **Entonces** debe ser capaz de
  localizar el textarea basándose en atributos estables como `role="textbox"` o `contenteditable="true"` junto con su
  posición.
- [ ] **Dado que** la UI de la página objetivo sufre mutaciones (cambia de vista), **Cuando** el textarea vuelve a
  aparecer, **Entonces** un `MutationObserver` debe detectarlo y re-enganchar las referencias.

**Notas Técnicas:**
Esta es un área de riesgo (Assumptions documentados). Las plataformas de IA cambian frecuentemente. Evitar
`querySelector('.clase-random')`. Depender firmemente de atributos de accesibilidad nativos de la plataforma para alta
resiliencia.

---

### Issue #10: [Inyección] - Implementación de ContextualWidget (HU06)

**Tipo:** Frontend / Content Script
**Dependencias:** Issue #4, Issue #9

**Descripción:**
Inyectar un botón flotante y sutil directamente sobre la interfaz de Google AI Studio, posicionado cerca del textarea
detectado en el Issue #9.

**Criterios de Aceptación:**

- [ ] **Dado que** el textarea de la IA está vacío, **Cuando** hago hover sobre el área, **Entonces** el botón sutil (
  ej. icono de rayo) aumenta su opacidad a 100%.
- [ ] **Dado que** hago clic en el botón flotante, **Entonces** despliega un menú pequeño (Drop-up/Popover) mostrando
  los 3 perfiles más usados (solicitados al Service Worker).

**Notas Técnicas:**
Asegurar que el z-index sea lo suficientemente alto para superponerse a la UI local, pero sin interferir con modales
nativos de Google AI Studio. Usar Shadow DOM para encapsular los estilos de Tailwind e impedir colisiones con la web
original.

---

### Issue #11: [Inyección] - Motor de Inyección de Texto y Flujo de Aplicación (HU02)

**Tipo:** Integración
**Dependencias:** Issue #8, Issue #9, Issue #10

**Descripción:**
Implementar la lógica final de inyección: tomar el contenido de un perfil seleccionado (desde el Popup o el
ContextualWidget), reemplazar el contenido del textarea de Google AI Studio, despachar eventos DOM para engañar a
React/Angular de que el humano tipeó, y registrar el uso en base de datos.

**Criterios de Aceptación:**

- [ ] **Dado que** aplico un perfil, **Cuando** el texto se inyecta, **Entonces** se deben despachar eventos nativos (
  `input`, `change`) para que Google AI Studio registre el texto y habilite su botón de envío.
- [ ] **Dado que** el perfil se inyecta exitosamente, **Entonces** se envía un mensaje `LOG_USAGE` al Service Worker
  para actualizar las métricas del perfil.
- [ ] **Dado que** aplico un perfil, **Entonces** se muestra un `ToastNotification` verde ("Perfil aplicado con éxito")
  inyectado en el DOM.

**Notas Técnicas:**
Crucial: Antes de sobrescribir el textarea, el script **debe leer el valor actual**. Si no está vacío, este flujo se
bloquea hasta invocar primero el servicio de Backup (Issue #12).

---

## Milestone 5: Red de Seguridad y Autoguardado (HU03)

### Issue #12: [Seguridad] - Interceptor de Textos Huérfanos y Controlador DB

**Tipo:** Backend Local / Content Script
**Dependencias:** Issue #11

**Descripción:**
Implementar la acción `BACKUP_ORPHAN_TEXT` en el Service Worker. Modificar el Content Script para que, si el usuario
tiene texto escrito manualmente no guardado en la caja de la IA y aplica un perfil, este texto se envíe al backend antes
del reemplazo.

**Criterios de Aceptación:**

- [ ] **Dado que** tengo texto manual escrito en la IA, **Cuando** aplico un perfil sobreescribiéndolo, **Entonces** el
  texto previo se guarda silenciosamente en la colección `recovery_history` con su timestamp y URL de origen.
- [ ] **Dado que** ocurrió un autoguardado preventivo, **Entonces** el `ToastNotification` debe ser de color Ámbar e
  indicar "Texto anterior respaldado en el historial".

**Notas Técnicas:**
Implementar también una sub-tarea para el arranque del Service Worker: al iniciar, ejecutar una purga (DELETE query)
sobre la colección `recovery_history` para borrar registros donde el timestamp indique más de 30 días de antigüedad,
evitando saturar la cuota de IndexedDB del usuario.

---

### Issue #13: [Seguridad] - Panel de RecoveryHistoryPanel

**Tipo:** Frontend
**Dependencias:** Issue #5, Issue #12

**Descripción:**
Desarrollar la interfaz (accesible desde el menú del Dashboard) que lista cronológicamente el texto respaldado por el
sistema de seguridad.

**Criterios de Aceptación:**

- [ ] **Dado que** accedo al Historial de Recuperación, **Cuando** visualizo la lista, **Entonces** cada entrada muestra
  un fragmento truncado, formato relativo de tiempo ("Hace 5 minutos") y el origen ("Google AI Studio").
- [ ] **Dado que** quiero recuperar mi trabajo, **Cuando** presiono el botón "Copiar" en una entrada, **Entonces** el
  texto completo se copia al portapapeles del sistema y recibo un feedback visual.

**Notas Técnicas:**
Se requerirá usar la API `navigator.clipboard.writeText()` para la acción de copiado.

---

## Milestone 6: Portabilidad de Datos (HU05)

### Issue #14: [Portabilidad] - Motor de Importación/Exportación de JSON

**Tipo:** Backend Local (Service Worker)
**Dependencias:** Issue #6

**Descripción:**
Implementar los controladores `EXPORT_DATA` y `IMPORT_DATA` en el Service Worker para permitir el respaldo físico de la
base de datos, resolviendo la necesidad crítica del MVP offline-first.

**Criterios de Aceptación:**

- [ ] **Dado que** solicito una exportación, **Cuando** el SW consulta Dexie, **Entonces** recupera todos los `profiles`
  donde `deleted_at == null`, los serializa en JSON y los retorna codificados en Base64.
- [ ] **Dado que** envío un JSON válido para importar, **Cuando** el SW lo procesa, **Entonces** realiza una operación
  `Upsert` (Inserta nuevos UUIDs y sobreescribe los UUIDs existentes) ignorando campos malformados.

**Notas Técnicas:**
Añadir validación estricta de esquema (Schema Validation) en el endpoint `IMPORT_DATA` para prevenir corrupción de DB si
el usuario carga un JSON inválido.

### Issue #15: [Portabilidad] - UI de Configuración y Portabilidad

**Tipo:** Frontend
**Dependencias:** Issue #14

**Descripción:**
Crear la pantalla de "Configuración" (Settings) que expondrá los botones para Descargar Copia de Seguridad y Cargar
Biblioteca.

**Criterios de Aceptación:**

- [ ] **Dado que** presiono "Exportar Perfiles", **Cuando** el proceso termina, **Entonces** el navegador fuerza
  automáticamente la descarga de un archivo `context_orchestrator_backup_[fecha].json`.
- [ ] **Dado que** selecciono un archivo mediante el explorador nativo, **Cuando** se completa la importación, *
  *Entonces** se recarga el listado de perfiles principal mostrando un resumen de la importación (Ej. "12 perfiles
  importados con éxito").

**Notas Técnicas:**
Para forzar la descarga sin un servidor backend real, usar el paradigma de `URL.createObjectURL(blob)` generado en el
cliente (Popup) a partir de la respuesta del Service Worker. Inyectar un elemento `<a>` dinámico, hacer click
programático y revocar el object URL para evitar memory leaks.