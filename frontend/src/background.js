import {db} from './db/database';
import {
    deleteProfile,
    exportData,
    getProfiles,
    importData,
    logUsage,
    saveProfile
} from './controllers/profileController';
import {backupOrphanText, getRecoveryHistory, rotateRecoveryHistory} from './controllers/backupController';

db.open().then(async () => {
    console.log("Base de datos ContextOrchestratorDB instanciada, fortificada y lista para operar.");

    try {
        // Ejecución de rotación (purgar registros de recovery_history > 30 días) al arrancar el Service Worker.
        await rotateRecoveryHistory();
        console.log("Rotación de historial de recuperación completada.");
    } catch (e) {
        console.error("Fallo al ejecutar la rotación del historial de recuperación:", e);
    }
}).catch((error) => {
    console.error("Fallo crítico al inicializar la base de datos local:", error);
});

export const processMessage = async (request) => {
    let safeActionName = 'DESCONOCIDA';

    try {
        const {action, payload} = request || {};

        if (typeof action === 'string') safeActionName = action;

        const ACTION_HANDLERS = {
            "PING": async () => ({status: "ok"}),
            "GET_PROFILES": getProfiles,
            "SAVE_PROFILE": saveProfile,
            "DELETE_PROFILE": deleteProfile,
            "LOG_USAGE": logUsage,
            "EXPORT_DATA": exportData,
            "IMPORT_DATA": importData,
            "BACKUP_ORPHAN_TEXT": backupOrphanText,
            "GET_RECOVERY_HISTORY": getRecoveryHistory
        };

        // Dentro de processMessage:
        if (ACTION_HANDLERS[safeActionName]) {
            return await ACTION_HANDLERS[safeActionName](payload);
        }

        console.warn(`Bus de mensajes: Acción no reconocida (${safeActionName})`);
        return {status: "error", message: `Acción no soportada: ${safeActionName}`};
    } catch (error) {
        console.error(`Bus de mensajes: Error crítico procesando la acción ${safeActionName}`, error);
        return {
            status: "error",
            message: "Error interno del Service Worker"
        };
    }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Seguridad y Validación del remitente del mensaje
    if (!sender || sender.id !== chrome.runtime.id) {
        console.warn("Bus de mensajes: Intento de comunicación bloqueado de origen no autorizado.");
        sendResponse({status: "error", message: "Acceso denegado: Remitente no autorizado."});
        return false;
    }

    // Procesamiento asíncrono manteniendo el canal de mensajes abierto
    processMessage(request).then(sendResponse);
    return true; // Obligatorio para respuestas asíncronas en Manifest V3
});