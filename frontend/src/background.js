import {db} from './db/database';

db.open().then(() => {
    console.log("Base de datos ContextOrchestratorDB instanciada, fortificada y lista para operar.");
}).catch((error) => {
    console.error("Fallo crítico al inicializar la base de datos local:", error);
});

export const processMessage = async (request) => {
    let safeActionName = 'DESCONOCIDA'; // Almacenamiento seguro

    try {
        const {action, payload} = request || {};

        // Si la lectura anterior no explotó, es seguro guardarlo como string/primitivo
        if (typeof action === 'string') safeActionName = action;

        switch (action) {
            case "PING":
                return {status: "ok"};
            default:
                console.warn(`Bus de mensajes: Acción no reconocida (${safeActionName})`);
                return {status: "error", message: `Acción no soportada: ${safeActionName}`};
        }
    } catch (error) {
        // [MITIGACIÓN]: Usamos safeActionName en lugar de request?.action.
        // Previene un "Double Fault" si el payload original contiene getters maliciosos.
        console.error(`Bus de mensajes: Error crítico procesando la acción ${safeActionName}`, error);

        return {
            status: "error",
            message: "Error interno del Service Worker"
        };
    }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!sender || sender.id !== chrome.runtime.id) {
        console.warn("Bus de mensajes: Intento de comunicación bloqueado de origen no autorizado.");
        sendResponse({status: "error", message: "Acceso denegado: Remitente no autorizado."});
        return false;
    }

    processMessage(request).then(sendResponse);
    return true;
});