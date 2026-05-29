import {addRecoveryHistorySecure, db} from '../db/database';

/**
 * Respalda texto huérfano redactado por el usuario usando la utilidad criptográfica segura.
 * Realiza una validación estricta de tipos de entrada para evitar inyección de payloads inesperados.
 */
export const backupOrphanText = async (payload: any) => {
    const {content, target_url} = payload || {};

    if (typeof content !== 'string' || typeof target_url !== 'string') {
        return {status: "error", message: "content y target_url deben ser cadenas válidas"};
    }

    if (content.trim() === '' || target_url.trim() === '') {
        return {status: "error", message: "content y target_url no pueden estar vacíos"};
    }

    await addRecoveryHistorySecure(target_url, content);
    return {status: "ok"};
};

/**
 * Retorna la lista de registros recientes de autoguardado ordenados cronológicamente.
 * Impone un límite rígido a las consultas para prevenir ataques de denegación de servicio (DoS)
 * por consumo masivo de memoria (Mitigación Hallazgo #4).
 */
export const getRecoveryHistory = async (payload: any) => {
    const parsedLimit = payload ? Number(payload.limit) : NaN;
    // Si limit no es válido o es excesivo, se acota estrictamente a un máximo seguro de 100.
    const limit = (!isNaN(parsedLimit) && parsedLimit > 0) ? Math.min(parsedLimit, 100) : 20;

    const history = await db.recovery_history.orderBy('timestamp').reverse().limit(limit).toArray();

    return {status: "ok", data: history};
};

/**
 * Lógica de negocio (Cron local): Elimina los registros más antiguos de 30 días para no saturar memoria.
 */
export const rotateRecoveryHistory = async () => {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const cutoffDate = Date.now() - THIRTY_DAYS_MS;

    await db.recovery_history.where('timestamp').below(cutoffDate).delete();
};