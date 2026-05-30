# Estado Actual del Proyecto

## 1. Visión General

El proyecto es una **Extensión de Chrome (Manifest V3)** diseñada como un orquestador de contextos "offline-first"
exclusivo para Google AI Studio. Su propósito central es eliminar la fricción operativa al cambiar de "System
Instructions" (instrucciones de sistema) permitiendo a los usuarios profesionales crear, categorizar y alternar entre
múltiples perfiles o "personas" de IA con un solo clic. El sistema funciona de manera autónoma en el navegador del
usuario, destacando por una inyección de texto transparente que engaña a los frameworks modernos para que detecten los
cambios, y una robusta "Red de Seguridad" cifrada que previene la pérdida de borradores no guardados.

¡Las funcionalidades (Issues #4, #5 y #6) se han integrado exitosamente y la aplicación cuenta con toda la lógica
central terminada, por lo que **está completamente lista para ser instalada y probada en el navegador**!

## 2. Stack Tecnológico

La arquitectura implementa un diseño moderno, fuertemente tipado y sin dependencias de servidores externos (
Local-First):

* **Core / Interfaz:** React 19 y TypeScript, empaquetados mediante Vite.
* **Estilos:** Tailwind CSS v4 (utilizado para una interfaz limpia, responsiva y de carga cognitiva cero).
* **Motor de Base de Datos Local:** IndexedDB, gestionado a través del ORM Dexie.js (versión 4.x).
* **Infraestructura de Extensión (MV3):**
    * *Service Worker (`background.js`)*: Actúa como el "Backend local" gestionando transacciones y seguridad.
    * *Content Script (`content.js`)*: Manipulador del DOM que interactúa directamente con la web de Google AI Studio.
* **Seguridad:** Web Crypto API nativa (AES-GCM) para el cifrado de datos sensibles.
* **Testing:** Vitest y React Testing Library (JSDOM).

## 3. Entidades Principales

El modelo de datos está estructurado no solo para el funcionamiento local actual, sino preparado (mediante UUIDs y
marcas de tiempo) para una futura sincronización en la nube mediante CRDTs (Conflict-free Replicated Data Types):

* **Perfil (Profile):** Representa una instrucción de sistema guardada por el usuario.
    * *Atributos clave:* `id` (UUID v4), `name` (título), `content` (el prompt completo), `tags` (etiquetas
      organizativas), `usage_count` y `last_used_at` (para ordenar inteligentemente los más usados), y `deleted_at` (
      borrado lógico o *soft-delete*).
* **Historial de Recuperación (RecoveryHistory):** Es el registro de la "Red de Seguridad", utilizado para salvar textos
  que el usuario escribió pero olvidó guardar antes de inyectar un nuevo perfil.
    * *Atributos clave:* `timestamp` (fecha del autoguardado), `target_url` (dónde ocurrió) y `content_saved` (el texto
      huérfano, almacenado de forma **cifrada** en base64 para garantizar la privacidad).
* **Claves Seguras (SecureKey - Interna):** Entidad técnica invisible para el usuario que guarda la llave maestra
  generada por el navegador para cifrar y descifrar el historial de recuperación.

## 4. Flujos y Funcionalidades Existentes

* **Orquestación y Gestión de Perfiles (CRUD):**
  El usuario ya puede visualizar una lista de sus prompts guardados, crear nuevos, editarlos y eliminarlos. La vista
  principal incluye un buscador en tiempo real y la capacidad de filtrar la lista mediante las etiquetas asignadas a
  cada perfil.
* **Inyección Inteligente de Contexto (Core Workflow):**
  Al hacer clic en "Aplicar" sobre un perfil, la extensión localiza dinámicamente el área de texto en Google AI Studio.
  Utiliza técnicas avanzadas (interceptando el `setter` nativo del prototipo de JavaScript) para inyectar el texto
  simulando escritura humana, de forma que los frameworks de Google reconozcan el input sin romperse.
* **Red de Seguridad Preventiva (Autoguardado):**
  Antes de que un perfil sobrescriba la caja de texto en la plataforma, el sistema verifica si el usuario había escrito
  algo manualmente. Si es así, ese borrador se cifra y se guarda en un historial. El usuario tiene una vista dedicada ("
  Red de Seguridad") para desencriptar y copiar esos textos perdidos con un clic.
* **Asistente Contextual Flotante:**
  Si el usuario abre un espacio de trabajo de IA completamente en blanco, un pequeño botón inyectado aparece
  discretamente en la pantalla de Google AI Studio sugiriendo aplicar un perfil de forma inmediata, evitando que el
  usuario deba abrir el panel (popup) de la extensión.
* **Mantenimiento Autónomo (Cron Job local):**
  Cada vez que la extensión se despierta, el Service Worker purga automáticamente los registros del historial de
  recuperación que tengan más de 30 días, asegurando que la memoria del navegador no se sature.
* **Portabilidad de Datos (Importación/Exportación):**
  Desde el panel de configuración, el usuario puede exportar toda su biblioteca a un archivo `.json` de forma segura y
  restaurarla en otro equipo, solucionando temporalmente la falta de sincronización en la nube. Incluye protecciones
  contra archivos corruptos o demasiado pesados (prevención DoS local).