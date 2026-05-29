# Arquitectura de Capa de Datos y Servicios Locales (Offline-First MVP)

> **Nota Arquitectónica sobre el Pivote:** Se ha reestructurado el diseño para operar sin dependencias de red ni
> servidores remotos. El "Backend" en esta fase estará compuesto por un **Service Worker** (procesos en segundo plano) y
> una **Base de Datos Local (IndexedDB)**. Se han mantenido deliberadamente los campos de control de versiones (
`updated_at`, `deleted_at`) para garantizar que, cuando se decida implementar la nube, la migración sea un proceso
> transparente y sin pérdida de datos.

## 1. Visión General y Decisiones Arquitectónicas

1. **Motor de Base de Datos Local:** Se utilizará **IndexedDB** (gestionado a través de la librería *Dexie.js*). Es
   persistente, soporta consultas asíncronas de alto rendimiento y permite indexación estructurada, superando
   ampliamente los límites de almacenamiento de `localStorage`.
2. **Arquitectura de Paso de Mensajes (Message Passing):** La interfaz de usuario (Popup) y los scripts inyectados en la
   página (Content Scripts) no interactuarán directamente con la base de datos. Enviarán mensajes al Service Worker (
   nuestro "Local Backend") para aislar la lógica de negocio de la lógica de presentación.
3. **Aislamiento de la Red de Seguridad (HU03):** El historial de textos recuperados se almacenará en una tabla separada
   con una política de rotación local (ej. borrar registros más antiguos de 30 días) para evitar saturar el
   almacenamiento del navegador.
4. **Exportación como Backup Core (HU05):** Al no haber nube, la portabilidad mediante archivos JSON se convierte en la
   funcionalidad crítica de respaldo.

## 2. Esquema de Base de Datos Local (IndexedDB)

A diferencia de las bases relacionales, IndexedDB usa colecciones de objetos (Object Stores). Definimos los índices
primarios e índices de búsqueda (aquellos por los que filtraremos).

```javascript
// Esquema conceptual de Dexie.js
const db = new Dexie("ContextOrchestratorDB");

db.version(1).stores({
    // ++id (Autoincremental/UUID), *tags (Multientry index para buscar por array)
    profiles: 'id, name, *tags, updated_at, deleted_at, usage_count, last_used_at',

    // Tabla para la HU03 (Red de Seguridad)
    recovery_history: '++id, timestamp, target_url'
});
```

### Estructura de Datos (Modelos)

**Colección `profiles`**

* `id` (String - UUID v4): Identificador único universal. (Generar en cliente, vital para futura nube).
* `name` (String): Nombre del perfil.
* `content` (String): El texto/instrucción de contexto.
* `tags` (Array of Strings): Etiquetas para el filtrado rápido.
* `usage_count` (Integer): Inicializa en 0. Incrementa cada vez que se aplica.
* `last_used_at` (Integer - Epoch Time): Timestamp para ordenar "Recientes".
* `updated_at` (Integer - Epoch Time): Control de versión.
* `deleted_at` (Integer - Epoch Time | Null): Si se elimina, se oculta de la UI pero se mantiene el registro (
  Soft-Delete) preparando el terreno para la sincronización.

**Colección `recovery_history`**

* `id` (Integer): Autoincremental local.
* `timestamp` (Integer - Epoch Time): Momento exacto del autoguardado.
* `target_url` (String): URL de la plataforma de IA donde ocurrió.
* `content_saved` (String): El texto que el usuario había escrito y que fue reemplazado.

## 3. Servicios y Lógica de Negocio (Service Worker)

El Service Worker actúa como controlador central del sistema offline.

### 3.1. Database Manager

Servicio encargado de todas las operaciones transaccionales sobre IndexedDB.

* **Gestor de Ciclo de Vida:** Al iniciar la app, verifica la integridad de la base de datos.
* **Rotación de Logs:** Un proceso (Cron local) que se ejecuta al arrancar el Service Worker y purga registros de
  `recovery_history` con más de 30 días para optimizar espacio.

### 3.2. Import/Export Engine (HU05)

* **Exportación:** Realiza un volcado (Dump) completo de la colección `profiles` (excluyendo los que tienen
  `deleted_at != null`), lo convierte en un `Blob` de formato JSON y desencadena una descarga nativa del navegador.
* **Importación:** Lee un archivo JSON, valida el esquema y realiza una operación *Upsert* (Insertar o Actualizar)
  basada en los `id` (UUIDs). Si un perfil importado tiene un UUID que ya existe localmente, se sobreescribe.

### 3.3. Context Interceptor (Puente con Content Scripts)

Se encarga de recibir las señales del usuario desde la página web (ej. el usuario hace clic en el widget de HU06) y
devuelve los perfiles recomendados evaluando la lógica de negocio (ordenándolos por `usage_count` y `last_used_at` de
mayor a menor).

## 4. Contratos de API Interna (Message Passing)

En lugar de HTTP/REST, las diferentes partes de la app se comunican mediante un bus de eventos con el siguiente contrato
estandarizado:

`{ action: "NOMBRE_RUTEO", payload: { ...datos } }`

### 4.1. CRUD de Perfiles

* **Ruta:** `GET_PROFILES`
    * **Payload:** `{ query: "", tags: [] }` (Opcionales para filtrar).
    * **Respuesta Exitosa:** `{ status: "ok", data: [{ ProfileObject }] }`
* **Ruta:** `SAVE_PROFILE`
    * **Payload:** `{ id?: "uuid", name: "...", content: "...", tags: ["..."] }` (Si no trae ID, es creación; si trae,
      es actualización).
    * **Respuesta Exitosa:** `{ status: "ok", data: { id: "uuid" } }`
* **Ruta:** `DELETE_PROFILE`
    * **Payload:** `{ id: "uuid" }`
    * **Lógica:** Localiza el ID y setea `deleted_at = Date.now()`.
    * **Respuesta Exitosa:** `{ status: "ok" }`

### 4.2. Operaciones de Inyección y Seguridad

* **Ruta:** `LOG_USAGE`
    * **Payload:** `{ id: "uuid" }`
    * **Lógica:** Incrementa `usage_count` en +1 y actualiza `last_used_at`. Esto se llama justo después de una
      inyección exitosa (HU02).
* **Ruta:** `BACKUP_ORPHAN_TEXT` (HU03)
    * **Payload:** `{ content: "texto previo...", target_url: "https://chat..." }`
    * **Lógica:** Inserta un nuevo registro en `recovery_history`.
    * **Respuesta Exitosa:** `{ status: "ok" }`
* **Ruta:** `GET_RECOVERY_HISTORY`
    * **Payload:** `{ limit: 20 }`
    * **Respuesta Exitosa:** `{ status: "ok", data: [{ RecoveryObject }] }`

### 4.3. Portabilidad (HU05)

* **Ruta:** `EXPORT_DATA`
    * **Payload:** `{}`
    * **Respuesta Exitosa:** `{ status: "ok", data: "data:application/json;base64,..." }` (El UI toma este base64 y
      fuerza la descarga).
* **Ruta:** `IMPORT_DATA`
    * **Payload:** `{ raw_json: "[{...}]" }`
    * **Respuesta Exitosa:** `{ status: "ok", imported_count: 12 }`
    * **Respuesta Error:** `{ status: "error", message: "Invalid schema" }`

## 5. Preparación para el Futuro (Path to Cloud)

Al utilizar `UUIDv4` para las claves primarias desde el inicio, y al mantener los campos `updated_at` y `deleted_at`
incluso de forma offline, la arquitectura local actual es una **réplica exacta del estado necesario para un sistema CRDT
o Last-Write-Wins**.

El día que decidas añadir la sincronización web (HU04):

1. Solo habrá que añadir un evento `SYNC_WITH_CLOUD` en el Service Worker.
2. El Service Worker extraerá todos los registros de IndexedDB donde `updated_at > last_sync_date`.
3. Enviará este bloque (payload JSON) al futuro endpoint de tu servidor, y recibirá los cambios remotos para insertarlos
   localmente, todo sin tener que reescribir la lógica base construida en esta fase.