### Issue #4: [Backend Local] - Completar API Interna (Bus de Mensajes) y Lógica de Negocio

**Tipo:** Backend (Service Worker)
**Dependencias:** Ninguna (Las bases de datos ya existen)

**Descripción:**
Actualmente el Service Worker (`background.js`) solo responde al evento `PING`. Es necesario expandir la función
`processMessage` para que actúe como el "Backend Controller" de nuestra aplicación, implementando todos los contratos de
la API interna definidos en `system.md`. Este issue encapsula toda la manipulación de base de datos y la
exportación/importación de perfiles.

**Criterios de Aceptación:**

- [ ] **Dado que** la UI solicita perfiles, **Cuando** se envía la acción `GET_PROFILES`, **Entonces** el Service Worker
  debe retornar todos los registros de Dexie que no tengan `deleted_at`, ordenados por `last_used_at` descendente.
- [ ] **Dado que** se crea o edita un perfil, **Cuando** se envía `SAVE_PROFILE`, **Entonces** se debe realizar un
  *upsert* en IndexedDB asignando `updated_at` a la fecha actual y generar un UUID si es creación.
- [ ] **Dado que** se elimina un perfil, **Cuando** se envía `DELETE_PROFILE`, **Entonces** se debe realizar un
  *Soft-Delete* asignando un timestamp a `deleted_at` (preparación para la nube).
- [ ] **Dado que** se inyecta un perfil, **Cuando** se envía `LOG_USAGE`, **Entonces** el contador `usage_count` debe
  incrementar en 1 y actualizar `last_used_at`.
- [ ] **Dado que** el usuario solicita exportar, **Cuando** se invoca `EXPORT_DATA`, **Entonces** se deben extraer todos
  los perfiles activos, convertirlos a una cadena JSON base64 y retornarlos.
- [ ] **Dado que** el usuario importa datos, **Cuando** se invoca `IMPORT_DATA` con un JSON válido, **Entonces** se
  realiza un *upsert* masivo emparejando por UUID.
- [ ] **Dado que** el Content Script envía un texto no guardado, **Cuando** se invoca `BACKUP_ORPHAN_TEXT`, **Entonces**
  se debe guardar usando la función criptográfica `addRecoveryHistorySecure` ya existente.
- [ ] **Dado que** el Service Worker se inicia, **Cuando** carga por primera vez, **Entonces** debe ejecutar una
  rotación eliminando registros de `recovery_history` más antiguos de 30 días.

**Notas Técnicas:**

- Refactoriza el `switch (action)` en `background.js` para delegar la lógica en controladores separados (ej.
  `profileController.js`, `backupController.js`) para no ensuciar el archivo principal.
- Utiliza las funciones de `database.ts` ya creadas.

---

### Issue #5: [Frontend/UI] - Construcción del Panel de Gestión (Popup) y Visualización de Perfiles

**Tipo:** Frontend (React)
**Dependencias:** Issue #4 (Para consumir la API local)

**Descripción:**
Reemplazar la pantalla base de prueba actual (`App.tsx`) por la interfaz principal del orquestador. El usuario debe
poder ver su lista de perfiles, crear nuevos, filtrarlos por etiquetas (Tags) y acceder a las utilidades del sistema (
Importar/Exportar e Historial de Recuperación).

**Criterios de Aceptación:**

- [ ] **Dado que** abro la extensión, **Cuando** la interfaz carga, **Entonces** debo ver una lista de mis perfiles
  guardados consumiendo la acción `GET_PROFILES` del Service Worker.
- [ ] **Dado que** quiero un nuevo contexto, **Cuando** hago clic en "Nuevo Perfil", **Entonces** se abre un
  formulario (título, contenido, etiquetas) que al guardar envía la acción `SAVE_PROFILE`.
- [ ] **Dado que** tengo muchos perfiles, **Cuando** escribo en la barra de búsqueda o hago clic en una etiqueta, *
  *Entonces** la lista debe filtrarse instantáneamente.
- [ ] **Dado que** selecciono un perfil en la lista, **Cuando** hago clic en "Aplicar", **Entonces** la UI debe enviar
  un mensaje al *Content Script* de la pestaña activa indicando el reemplazo de texto y luego cerrar el popup.
- [ ] **Dado que** deseo respaldar mi biblioteca, **Cuando** voy a "Configuración", **Entonces** debo tener botones
  funcionales para Importar y Exportar JSON (HU05).
- [ ] **Dado que** perdí información, **Cuando** accedo a la "Red de Seguridad", **Entonces** debo ver una lista de
  textos recientes (HU03) descifrados usando la función `getDecryptedRecoveryHistory` local, con la opción de copiarlos
  al portapapeles.

**Notas Técnicas:**

- Para enviar mensajes entre React y el Service Worker, crea un hook custom `useMessageBus<T>(action, payload)`.
- La UI debe estar constreñida a los límites del Popup de MV3 (aprox 400x500px). Evita modales que sobrepasen la altura,
  usa vistas (routing condicional o un enrutador ligero de React).

---

### Issue #6: [Integración] - Content Script, Inyector de Contexto y Asistente Contextual

**Tipo:** Content Script / DOM Manipulation
**Dependencias:** Issue #4 y #5

**Descripción:**
Este issue aborda la interacción directa con la web de Google AI Studio (`content.js`). Su misión es identificar el área
de texto donde se escriben los "System Instructions" de la IA, recuperar texto huérfano para salvaguardarlo e inyectar
los nuevos perfiles de forma indetectable para la plataforma (simulando eventos de teclado nativos si es necesario para
que React/Angular en la web host reconozca el input).

**Criterios de Aceptación:**

- [ ] **Dado que** la UI le dice al Content Script que aplique un perfil, **Cuando** se recibe el mensaje, **Entonces**
  el script debe localizar de forma robusta el `<textarea>` (o `contenteditable`) de instrucciones de AI Studio.
- [ ] **Dado que** localiza el área de texto, **Cuando** ésta ya contiene texto escrito por el usuario, **Entonces** el
  script debe primero enviar `BACKUP_ORPHAN_TEXT` con el texto actual al Service Worker antes de sobreescribirlo (Red de
  Seguridad).
- [ ] **Dado que** el texto ha sido inyectado, **Cuando** la plataforma de AI Studio revisa el input, **Entonces** el
  script debe disparar los eventos `input` o `change` apropiados para que la interfaz web de Google no considere que el
  campo sigue vacío.
- [ ] **Dado que** abro un nuevo chat en blanco, **Cuando** el Content Script detecta un área de texto vacía, **Entonces
  ** debe inyectar un pequeño "Asistente Flotante" (Botón de IA) sutil cerca del input para inyectar un perfil
  predeterminado o abrir un menú rápido (HU06).
- [ ] **Dado que** inyecto exitosamente un perfil, **Cuando** finaliza el reemplazo, **Entonces** se debe enviar la
  acción `LOG_USAGE` al Service Worker para contabilizar su uso.

**Notas Técnicas:**

- Google AI Studio usa frameworks web modernos. Cambiar la propiedad `.value` de un input por lo general no funciona
  directamente en React/Angular si no invocas el `setter` nativo. Investiga la inyección de input usando
  `Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set`.
- Utiliza `MutationObserver` para identificar cuándo carga la página de Google AI Studio y el input se hace visible en
  el DOM.
- El Asistente Flotante debe usar Shadow DOM para asegurar que los estilos globales de Google AI Studio no rompan el CSS
  de la extensión.