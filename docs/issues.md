### Issue #7: [Integración] - Resiliencia del Content Script y Fallback de Inyección

**Tipo:** Fullstack (Service Worker / Frontend)
**Dependencias:** Ninguna

**Descripción:**
Actualmente, si el usuario instala la extensión teniendo ya abierto Google AI Studio, la comunicación falla arrojando
`chrome.runtime.lastError`. Debemos implementar un mecanismo de resiliencia: si el `sendMessage` falla al intentar
inyectar un perfil, el orquestador debe usar la API `chrome.scripting` para inyectar dinámicamente el Content Script en
caliente, y luego reintentar la operación, logrando una experiencia "Zero-Friction" sin obligar al usuario a recargar la
página.

**Criterios de Aceptación:**

- [ ] **Dado que** el Content Script no está cargado en la pestaña activa, **Cuando** el usuario hace clic en "Aplicar",
  **Entonces** la función `handleApply` detectará el `lastError`.
- [ ] **En ese momento**, el sistema debe invocar `chrome.scripting.executeScript` para inyectar `src/content.js`
  programáticamente en esa pestaña.
- [ ] **Una vez inyectado**, se debe reintentar el envío del mensaje `INJECT_PROFILE` de forma transparente para el
  usuario.
- [ ] **Dado que** la pestaña no es `aistudio.google.com`, **Cuando** el usuario hace clic en aplicar, **Entonces** la
  UI debe mostrar un mensaje claro y amigable (Toast o alerta) indicando: "Navega a Google AI Studio para aplicar
  perfiles", en lugar de fallar silenciosamente.

**Notas Técnicas:**

- Requerirás añadir el permiso `"scripting"` en el array de `permissions` del `manifest.json`.
- Modifica `handleApply` en `MainView.tsx` para implementar este bloque `try/catch` con estrategia de reintento (Retry
  Pattern).

---

### Issue #8: [Frontend/Integración] - Captura de Contexto Activo (Importación en Vivo)

**Tipo:** Fullstack (Content Script / React UI)
**Dependencias:** Ninguna (Preferiblemente posterior al Issue #7)

**Descripción:**
Muchos usuarios iteran sus "System Instructions" directamente en la caja de texto de Google AI Studio. Si logran un
prompt excelente, actualmente deben copiarlo y pegarlo manualmente en la extensión para guardarlo. Vamos a añadir la
funcionalidad "Capturar desde la página", que extraerá el texto actual del DOM y abrirá automáticamente el formulario
de "Nuevo Perfil" pre-llenado con ese contenido.

**Criterios de Aceptación:**

- [ ] **Dado que** el Content Script está activo, **Cuando** recibe el nuevo mensaje `EXTRACT_CURRENT_CONTEXT`, *
  *Entonces** debe utilizar la función existente `findSystemInstructionInput()` para leer el `value` o `textContent`
  actual del input y retornarlo al emisor.
- [ ] **Dado que** abro la vista principal de la extensión (`MainView`), **Cuando** visualizo las acciones principales,
  **Entonces** debe haber un botón secundario visible (ej. icono de "Capturar/Gotero") junto a "Nuevo Perfil".
- [ ] **Dado que** hago clic en el botón de capturar, **Entonces** la UI solicita el texto a la pestaña activa, navega
  hacia la vista `FormView` y pre-llena el área de texto de "Instrucción (Contexto)" con el texto recuperado.
- [ ] **Dado que** la caja de texto en la web estaba vacía, **Cuando** intento capturar, **Entonces** la UI muestra un
  aviso (Toast): "No se encontró texto en el editor de AI Studio".

**Notas Técnicas:**

- En `content.js`, añade el nuevo `case` en el listener de mensajes:
  ```javascript
  if (message.action === 'EXTRACT_CURRENT_CONTEXT') {
      const input = findSystemInstructionInput();
      const content = input ? (input.value || input.textContent || '') : '';
      sendResponse({ status: 'ok', data: content });
      return true;
  }
  ```
- En `MainView.tsx`, añade un botón flotante secundario o inclúyelo en el Header. Al recibir los datos, puedes usar un
  estado global o pasar el contenido extraído a través de props al montar el `FormView` (ej. actualizando la prop para
  que acepte un objeto `{ id: string | null, initialContent?: string }`).

---

### Issue #9: [Base de Datos & SW] - Evolución del Motor Local y Lógica de Versionado (Time Machine)

**Tipo:** Backend Local (IndexedDB / Service Worker)
**Dependencias:** Ninguna

**Descripción:**
La base de datos local actual debe evolucionar (v2) para soportar el versionado inmutable de los prompts y la
preparación para la sincronización (CRDT/LWW). Este issue aborda la modificación del esquema de Dexie y la intercepción
en el Service Worker para capturar instantáneas de los perfiles antes de que sean modificados (Time Machine).

**Criterios de Aceptación:**

- [ ] **Dado que** la extensión se actualiza, **Cuando** se inicializa Dexie, **Entonces** la base de datos debe migrar
  a `version(2)`, añadiendo los índices `sync_status`, `is_local_only` a `profiles` y creando la tabla
  `profile_versions`.
- [ ] **Dado que** se edita un perfil existente, **Cuando** el usuario envía la acción `SAVE_PROFILE` y el contenido
  difiere del actual, **Entonces** el Service Worker debe insertar una copia del contenido anterior en
  `profile_versions` antes de aplicar el *upsert* principal.
- [ ] **Dado que** la UI solicita el historial, **Cuando** se envía el mensaje `GET_PROFILE_VERSIONS` con un
  `profile_id`, **Entonces** el sistema debe devolver la lista de versiones ordenadas cronológicamente (DESC).
- [ ] **Dado que** se requiere revertir cambios, **Cuando** se invoca `RESTORE_VERSION`, **Entonces** el contenido
  actual pasa a ser una nueva versión histórica y el contenido antiguo sobreescribe el `content` del perfil activo.

**Notas Técnicas:**

- *Risk Assumption:* Se asume el uso del Dexie Upgrade Framework. Asegúrate de retornar migraciones seguras en el
  archivo `database.ts` para no romper instalaciones existentes de usuarios.
- Agrega el Enum `sync_status: 'synced' | 'pending' | 'error'` a los modelos. Todo nuevo perfil debe nacer como
  `pending`.

---

### Issue #10: [Frontend/UI] - Interfaz de la "Máquina del Tiempo" y Modificadores de Privacidad

**Tipo:** Frontend (React)
**Dependencias:** Issue #7

**Descripción:**
Añadir la capa visual a los motores de versionado creados en el Issue #7. Requiere crear un visor de historial dentro
del formulario de edición de perfiles (`FormView`) y un interruptor global de privacidad (Offline-Only) en la vista de
configuración (`SettingsView`) de acuerdo a la HU-03.

**Criterios de Aceptación:**

- [ ] **Dado que** accedo a `SettingsView`, **Cuando** alterno el interruptor "Sincronización en la Nube" (desactivado),
  **Entonces** se debe enviar la acción `SET_SYNC_PREFERENCE` al Service Worker.
- [ ] **Dado que** estoy editando un perfil, **Cuando** hago clic en el nuevo botón "Historial de Versiones", **Entonces
  ** se despliega una lista (modal o panel) con las fechas de edición pasadas usando `GET_PROFILE_VERSIONS`.
- [ ] **Dado que** visualizo una versión pasada, **Cuando** hago clic en "Restaurar", **Entonces** el editor de texto
  adopta inmediatamente ese texto, notifica visualmente el éxito y cierra el panel.

**Notas Técnicas:**

- En `SettingsView`, si el modo nube está desactivado, visualmente advierte que los nuevos perfiles se guardarán con la
  bandera `is_local_only = true`.
- Utiliza las directivas de `Tailwind CSS v4` para construir el visor de historial sin exceder la altura máxima
  permitida del popup (aprox 500px). Sugiero un componente colapsable (Accordion) para ver fragmentos de texto antiguos.

---

### Issue #11: [Cloud Backend] - Arquitectura Serverless y Contratos de API Remota

**Tipo:** DevOps / Cloud API
**Dependencias:** Ninguna (Desarrollo en paralelo)

**Descripción:**
Configurar la infraestructura de backend y la base de datos remota. Dada la naturaleza de extensión de Chrome, se debe
implementar autenticación (Supabase/Firebase) y desplegar el endpoint transaccional de sincronización que gestionará la
resolución de conflictos (Last-Write-Wins).

**Criterios de Aceptación:**

- [ ] **Dado que** requerimos persistencia, **Cuando** se despliega la base de datos PostgreSQL, **Entonces** deben
  existir las tablas `users`, `profiles`, y `profile_versions` con sus relaciones y constraints.
- [ ] **Dado que** un cliente solicita sincronizar, **Cuando** hace un `POST /api/v1/sync` con su `last_sync_timestamp`
  y un payload de perfiles `pending`, **Entonces** el servidor debe procesar un UPSERT resolviendo conflictos donde el
  `updated_at` remoto prevalece sobre el local o viceversa.
- [ ] **Dado que** el cliente sube cambios, **Cuando** la transacción de BD finaliza, **Entonces** el servidor debe
  retornar al cliente los `remote_changes` que el cliente aún no tiene y un nuevo `server_timestamp`.
- [ ] **Dado que** requerimos autenticación, **Cuando** se llama a `POST /api/v1/auth/exchange`, **Entonces** debe
  retornar un JWT válido y registrar al usuario si no existía.

**Notas Técnicas:**

- Se recomienda el uso de **Supabase Edge Functions** o **Cloudflare Workers** para el endpoint `/sync`, apuntando a una
  base de datos con Connection Pooling (PgBouncer/Supavisor).
- Asegúrate de rechazar explícitamente cualquier perfil que el cliente envíe si contiene la flag `is_local_only` (
  Defensa en profundidad en el backend).

---

### Issue #12: [Fullstack / Integración] - Motor Cloud Sync Manager en Service Worker

**Tipo:** Background Service / Integración REST
**Dependencias:** Issue #7 y Issue #9

**Descripción:**
La pieza maestra que unirá el cliente local con el servidor remoto. Construir el orquestador de sincronización en
`background.js` que se ejecutará periódicamente de forma silenciosa (Background Fetch / Alarms), empujando cambios
locales y descargando cambios de otros dispositivos (Push/Pull Delta Sync).

**Criterios de Aceptación:**

- [ ] **Dado que** el usuario habilitó la nube, **Cuando** el `chrome.alarms` se dispara (ej. cada 5 min) o hay conexión
  restablecida, **Entonces** el Service Worker debe ejecutar el ciclo de sincronización sin interrumpir el UI.
- [ ] **Dado que** el cliente tiene perfiles modificados (`sync_status: 'pending'`), **Cuando** el SW lanza el
  pull/push, **Entonces** se debe enviar el payload excluyendo estrictamente los registros con `is_local_only: true`.
- [ ] **Dado que** el servidor responde con perfiles más recientes, **Cuando** el SW procesa la respuesta, **Entonces**
  debe hacer un *upsert* en IndexedDB, marcar los registros procesados como `synced`, actualizar el
  `last_sync_timestamp` en `app_state` e inyectar el evento `SYNC_COMPLETED` a la UI.
- [ ] **Dado que** el usuario intenta vincular su cuenta, **Cuando** hace clic en "Login con Google" en el UI, *
  *Entonces** la extensión debe usar `chrome.identity.getAuthToken` y comunicarse con el endpoint de exchange (Issue #9)
  para obtener el JWT y guardarlo seguramente.

**Notas Técnicas:**

- Almacena el JWT en Session Storage o en la API nativa de `chrome.storage.local` configurado de manera segura.
- Si una operación de red falla (Offline), la promesa debe resolverse silenciosamente y dejar los registros como
  `pending` para el siguiente intento (Offline-First behavior).
