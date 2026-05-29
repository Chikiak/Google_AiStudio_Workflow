import Dexie, {type Table} from 'dexie';

// Modelo preparado para Sincronización, Control de Versiones y Soft Deletes
export interface Profile {
    id: string; // UUID v4 nativo
    name: string;
    /**
     * @security XSS Risk: El contenido proviene de fuentes externas o input del usuario.
     * NUNCA debe ser renderizado usando APIs inseguras (ej. `dangerouslySetInnerHTML`)
     * sin una sanitización estricta utilizando herramientas como `DOMPurify.sanitize()`.
     * Preferiblemente, dependa del renderizado por defecto y seguro de React.
     */
    content: string;
    tags: string[];
    usage_count: number;
    last_used_at: number;
    updated_at: number;
    deleted_at: number | null;
}

// Modelo para el Autoguardado Preventivo (Red de Seguridad)
export interface RecoveryHistory {
    id?: number; // Autoincremental
    timestamp: number;
    target_url: string;
    /**
     * @security Datos Sensibles y XSS:
     * Almacenado en formato cifrado (iv_base64:ciphertext_base64) para prevenir
     * exposición de secretos locales. El texto plano recuperado DEBE ser sanitizado.
     */
    content_saved: string;
}

// Interfaz interna para gestionar la persistencia segura de la clave criptográfica local
interface SecureKey {
    id: number;
    key: CryptoKey;
}

export class ContextOrchestratorDB extends Dexie {
    profiles!: Table<Profile, string>;
    recovery_history!: Table<RecoveryHistory, number>;
    _crypto_keys!: Table<SecureKey, number>; // Tabla privada para almacenar la CryptoKey maestra

    constructor() {
        super('ContextOrchestratorDB');

        // Definición de esquema para la versión 1 (incluye la tabla de mitigación criptográfica)
        this.version(1).stores({
            profiles: 'id, name, *tags, updated_at, deleted_at, usage_count, last_used_at',
            recovery_history: '++id, timestamp, target_url',
            _crypto_keys: 'id'
        });
    }
}

// Singleton de la base de datos
export const db = new ContextOrchestratorDB();

/**
 * Utilidad generadora de UUIDs (v4) apoyada en la Web Crypto API nativa del navegador.
 * Seguro ante colisiones y sin usar dependencias externas.
 */
export const generateUUID = (): string => {
    return crypto.randomUUID();
};


/* =========================================================================
 *  MÓDULO DE SEGURIDAD Y CIFRADO TRANSPARENTE
 * ========================================================================= */

// Caché de la promesa en memoria para prevenir condiciones de carrera (Race Conditions)
// asegurando que llamadas concurrentes compartan la misma ejecución de inicialización.
let masterKeyPromise: Promise<CryptoKey> | null = null;

/**
 * @internal Solo para propósitos de testing.
 * Reinicia la caché de la clave maestra para evitar fugas de estado entre tests.
 */
export const _resetMasterKeyCache = (): void => {
    masterKeyPromise = null;
};

// Extrae la clave maestra local o genera una nueva no exportable
async function getMasterKey(): Promise<CryptoKey> {
    if (masterKeyPromise) return masterKeyPromise;

    masterKeyPromise = (async () => {
        try {
            const existing = await db._crypto_keys.get(1);
            if (existing) return existing.key;

            const key = await crypto.subtle.generateKey(
                {name: "AES-GCM", length: 256},
                false,
                ["encrypt", "decrypt"]
            );
            await db._crypto_keys.put({id: 1, key});
            return key;
        } catch (error) {
            masterKeyPromise = null; // Limpiar caché en caso de fallo crítico
            throw new Error(`Fallo al generar/obtener la clave maestra: ${error}`);
        }
    })();

    return masterKeyPromise;
}

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Funciones utilitarias robustas para manejo seguro de bytes a base64 (Evita btoa/atob de JSDOM)
function bufferToBase64(buffer: ArrayBuffer | ArrayBufferView): string {
    // ArrayBuffer.isView es seguro contra cruce de entornos (cross-realm) como Node <-> JSDOM
    const bytes = ArrayBuffer.isView(buffer)
        ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
        : new Uint8Array(buffer);

    let base64 = "";
    for (let i = 0; i < bytes.length; i += 3) {
        const chunk = (bytes[i] << 16) |
            ((i + 1 < bytes.length ? bytes[i + 1] : 0) << 8) |
            (i + 2 < bytes.length ? bytes[i + 2] : 0);

        base64 += B64_CHARS[(chunk >> 18) & 63];
        base64 += B64_CHARS[(chunk >> 12) & 63];
        base64 += i + 1 < bytes.length ? B64_CHARS[(chunk >> 6) & 63] : "=";
        base64 += i + 2 < bytes.length ? B64_CHARS[chunk & 63] : "=";
    }
    return base64;
}

function base64ToBuffer(base64: string): ArrayBuffer {
    const lookup = new Uint8Array(256);
    for (let i = 0; i < B64_CHARS.length; i++) {
        lookup[B64_CHARS.charCodeAt(i)] = i;
    }

    const cleanBase64 = base64.replace(/=+$/, "");
    const len = cleanBase64.length;
    const bufferLength = Math.floor(base64.length * 0.75) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
    const bytes = new Uint8Array(bufferLength);

    let p = 0;
    for (let i = 0; i < len; i += 4) {
        const chunk = (lookup[cleanBase64.charCodeAt(i)] << 18) |
            ((i + 1 < len ? lookup[cleanBase64.charCodeAt(i + 1)] : 0) << 12) |
            ((i + 2 < len ? lookup[cleanBase64.charCodeAt(i + 2)] : 0) << 6) |
            (i + 3 < len ? lookup[cleanBase64.charCodeAt(i + 3)] : 0);

        if (p < bytes.length) bytes[p++] = (chunk >> 16) & 255;
        if (p < bytes.length) bytes[p++] = (chunk >> 8) & 255;
        if (p < bytes.length) bytes[p++] = chunk & 255;
    }
    return bytes.buffer;
}

/**
 * Cifra y guarda el texto de autoguardado en el historial de forma segura.
 * @security FILTRADO EN ORIGEN: Antes de invocar este método desde el Content Script,
 * es crítico confirmar que no se están interceptando `type="password"`, `cc-number` ni tokens explícitos.
 */
export async function addRecoveryHistorySecure(url: string, rawContent: string): Promise<void> {
    const key = await getMasterKey();
    const encoded = new TextEncoder().encode(rawContent);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await crypto.subtle.encrypt(
        {name: "AES-GCM", iv},
        key,
        encoded
    );

    const ivBase64 = bufferToBase64(iv);
    const cipherBase64 = bufferToBase64(ciphertext);

    await db.recovery_history.add({
        timestamp: Date.now(),
        target_url: url,
        content_saved: `${ivBase64}:${cipherBase64}`
    });
}

/**
 * Recupera y descifra el contenido protegido almacenado en el historial de recuperación.
 * NOTA: El retorno es raw string y debe ser sanitizado antes de usarse en la UI.
 */
export async function getDecryptedRecoveryHistory(id: number): Promise<string | null> {
    const record = await db.recovery_history.get(id);
    if (!record || !record.content_saved) return null;

    const parts = record.content_saved.split(':');

    // Fail-Safe: Nunca devolver datos no particionados si se esperaba cifrado
    if (parts.length !== 2) {
        console.warn("Alerta de Integridad: El registro de recuperación no tiene el formato de cifrado válido.");
        return null;
    }

    try {
        const key = await getMasterKey();
        const iv = base64ToBuffer(parts[0]);
        const ciphertext = base64ToBuffer(parts[1]);

        const decrypted = await crypto.subtle.decrypt(
            {name: "AES-GCM", iv: new Uint8Array(iv)},
            key,
            ciphertext
        );
        return new TextDecoder().decode(decrypted);
    } catch (error) {
        console.error("Fallo de seguridad o integridad al descifrar el historial de recuperación:", error);
        return null;
    }
}