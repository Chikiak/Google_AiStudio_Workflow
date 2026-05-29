import {db} from './db/database';

console.log("Service Worker (Background) inicializado correctamente.");

// Forzar la apertura e inicialización de IndexedDB al arrancar el Service Worker
db.open().then(() => {
    console.log("Base de datos ContextOrchestratorDB instanciada, fortificada y lista para operar.");
}).catch((error) => {
    console.error("Fallo crítico al inicializar la base de datos local:", error);
});