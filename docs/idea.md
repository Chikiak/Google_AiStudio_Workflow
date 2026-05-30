# requerimientos_funcionales.md

## 1. Propósito y Visión (El "Por qué")

*[Suposición de Producto]*: Dado que el usuario no ha proporcionado nuevas ideas explícitas, he analizado el documento
`estado_actual.md` y diseñado la siguiente evolución lógica y estratégica del producto basándome en las necesidades
críticas de los usuarios profesionales y en la preparación de la arquitectura actual.

**El Problema:**
Actualmente, la herramienta elimina maravillosamente la fricción operativa en un solo equipo y protege contra pérdidas
accidentales de contexto. Sin embargo, los profesionales de la Inteligencia Artificial (Prompt Engineers, Product
Managers, Desarrolladores) rara vez trabajan en un solo dispositivo. Obligar al usuario a utilizar un flujo manual de
importación/exportación de archivos compromete la retención, genera silos de información y aumenta la carga cognitiva.
Además, el perfeccionamiento de un "prompt" es un proceso iterativo; si un usuario edita un perfil y el nuevo enfoque
degrada la calidad de las respuestas de la IA, actualmente no tiene forma de retroceder a la versión anterior que sí
funcionaba.

**El Valor de Negocio y Visión:**
Esta iniciativa transformará la extensión de una "herramienta utilitaria local" a un "Ecosistema de Productividad
Omnipresente".

* **Retención y Engagement:** La sincronización en la nube vincula al usuario con el producto a largo plazo, haciendo
  que la extensión sea indispensable en su día a día sin importar desde qué equipo trabaje.
* **Seguridad Psicológica:** Al introducir un historial de iteraciones (versionado de prompts), el usuario tendrá la
  libertad de experimentar e iterar sus instrucciones de sistema sin miedo a perder el conocimiento previamente
  refinado.

## 2. Descripción de la Solución (El "Qué")

La nueva iniciativa se divide en dos grandes bloques funcionales que potencian el flujo de trabajo del usuario sin
interrumpir la promesa de valor "offline-first" que ya posee el producto:

**A. Sincronización Transparente Multi-Dispositivo (Cloud-Sync):**
Un sistema optativo donde el usuario puede vincular su cuenta para que su biblioteca de perfiles (prompts), etiquetas e
historial de uso viajen con él a cualquier dispositivo donde inicie sesión. El sistema funcionará en segundo plano y
resolverá conflictos de forma silenciosa, manteniendo siempre la capacidad de trabajar sin conexión a internet y
sincronizando los cambios en cuanto la red vuelva a estar disponible.

**B. Máquina del Tiempo de Perfiles (Versionado de Prompts):**
Cada vez que el usuario edite y guarde un perfil existente, el sistema conservará una instantánea de la versión
anterior. El usuario contará con una interfaz limpia dentro del detalle del perfil para visualizar su evolución en el
tiempo y restaurar cualquier versión pasada con un solo clic.

## 3. Historias de Usuario

* **HU-01: Sincronización Automática Multi-Equipo**
  *Como* ingeniero de prompts que utiliza varios ordenadores,
  *Quiero* que mi biblioteca de perfiles se sincronice automáticamente a través de mi cuenta de usuario,
  *Para* tener siempre acceso a mis instrucciones de sistema actualizadas sin depender de exportaciones e importaciones
  manuales.

* **HU-02: Trabajo ininterrumpido sin conexión (Offline-First)**
  *Como* profesional de IA en constante movimiento,
  *Quiero* poder seguir creando y editando perfiles aunque no tenga conexión a internet,
  *Para* no detener mi flujo de trabajo y confiar en que los cambios se reflejarán en la nube cuando recupere la
  conexión.

* **HU-03: Privacidad y Pausa de Sincronización**
  *Como* consultor que maneja datos altamente confidenciales,
  *Quiero* poder desactivar la sincronización en la nube en cualquier momento,
  *Para* mantener mis perfiles más sensibles estrictamente de forma local.

* **HU-04: Historial de Iteraciones de Perfiles**
  *Como* creador de perfiles de IA,
  *Quiero* ver un historial de las versiones anteriores de un prompt específico,
  *Para* auditar cómo ha evolucionado mi instrucción a lo largo del tiempo.

* **HU-05: Restauración de Versiones Anteriores**
  *Como* usuario que experimenta constantemente con nuevos enfoques,
  *Quiero* poder restaurar una versión anterior de mi perfil con un solo clic,
  *Para* revertir cambios rápidamente si la nueva instrucción genera peores resultados en la IA.

## 4. Criterios de Aceptación

**Para HU-01 (Sincronización Automática Multi-Equipo):**

* **Dado que** el usuario ha iniciado sesión y habilitado la sincronización en el Dispositivo A y en el Dispositivo B,
* **Cuando** crea, edita o elimina un perfil en el Dispositivo A,
* **Entonces** el cambio debe reflejarse automáticamente en el Dispositivo B en un tiempo razonable, sin requerir
  recargar la página o la extensión.

**Para HU-02 (Trabajo ininterrumpido sin conexión):**

* **Dado que** el usuario pierde la conexión a internet,
* **Cuando** realiza múltiples modificaciones en sus perfiles,
* **Entonces** la extensión debe guardar los cambios localmente de forma exitosa sin mostrar errores intrusivos,
* **Y** debe sincronizar estas modificaciones con la nube automáticamente en el momento en que se restablezca la
  conexión.

**Para HU-03 (Privacidad y Pausa de Sincronización):**

* **Dado que** el usuario tiene la sincronización activa,
* **Cuando** desactiva la opción desde el panel de configuración,
* **Entonces** cualquier perfil nuevo creado a partir de ese momento solo debe existir en su máquina local y no debe
  enviarse a la nube.

**Para HU-04 y HU-05 (Versionado y Restauración):**

* **Dado que** un usuario está editando un perfil que ha sido modificado previamente,
* **Cuando** accede a la sección "Historial de Versiones" de dicho perfil,
* **Entonces** debe ver una lista cronológica de las modificaciones (con fecha y hora),
* **Y cuando** hace clic en "Restaurar" en una versión antigua,
* **Entonces** el contenido de esa versión anterior debe convertirse inmediatamente en la versión activa y actual del
  perfil.

## 5. Priorización (MoSCoW)

**Must Have (Imprescindibles para el lanzamiento de la iniciativa):**

* Flujo de inicio de sesión y vinculación de cuenta de usuario.
* Sincronización bidireccional automática de Perfiles y Etiquetas.
* Persistencia del modo "Offline-First" (los fallos de red no deben bloquear el uso de la extensión).
* Resolución transparente de conflictos (ej. si el usuario edita el mismo perfil en dos equipos desconectados, prevalece
  la versión más reciente en base al tiempo de modificación).

**Should Have (Altamente recomendables, aportan el mayor valor diferencial):**

* Visualización del historial de versiones por perfil.
* Botón de restauración rápida de versiones (Undo/Revert a nivel de prompt).
* Indicador visual en la interfaz de la extensión que confirme al usuario que sus datos están "Sincronizados" o "
  Pendientes de sincronización".

**Could Have (Deseables, mejoran la experiencia pero no bloquean):**

* Sincronización de las métricas de uso (`usage_count` y `last_used_at`) para que el orden de perfiles favoritos sea
  idéntico en todos los dispositivos.
* Posibilidad de poner nombre a ciertas versiones de un prompt (ej: "Versión agresiva", "Versión concisa").

**Won't Have (Fuera de alcance para esta fase):**

* Colaboración en tiempo real (varios usuarios editando el mismo perfil al estilo Google Docs).
* Compartir perfiles mediante un enlace público (esta será una iniciativa separada enfocada en viralidad).
* Sincronización cruzada con otras plataformas ajenas a Google AI Studio.