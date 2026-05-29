import 'fake-indexeddb/auto'; // Polyfill VITAL: Simula IndexedDB nativo en Node/JSDOM
import {beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {
    _resetMasterKeyCache,
    addRecoveryHistorySecure,
    db,
    generateUUID,
    getDecryptedRecoveryHistory
} from './database';

beforeAll(() => {
    // Garantizar Web Crypto API en JSDOM
    if (typeof window !== 'undefined' && !window.crypto) {
        Object.defineProperty(window, 'crypto', {
            value: globalThis.crypto,
            writable: true
        });
    }
});

describe('Database & Cryptography Unit Tests', () => {

    // Limpiamos la DB real (en memoria) y la caché antes de cada test para un aislamiento perfecto
    beforeEach(async () => {
        _resetMasterKeyCache();
        await db.recovery_history.clear();
        await db._crypto_keys.clear();
    });

    describe('generateUUID()', () => {
        it('[Happy Path] Debe generar un UUID v4 nativo utilizando la Web Crypto API', () => {
            const uuid = generateUUID();
            expect(uuid).toBeDefined();
            expect(typeof uuid).toBe('string');
            expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });
    });

    describe('addRecoveryHistorySecure()', () => {
        it('[Happy Path] Debe cifrar un contenido de texto y persistirlo correctamente', async () => {
            const testUrl = 'https://aistudio.google.com/test';
            const testContent = 'Instrucciones secretas de mi sistema';

            await addRecoveryHistorySecure(testUrl, testContent);

            const records = await db.recovery_history.toArray();
            expect(records.length).toBe(1);

            const savedRecord = records[0];
            expect(savedRecord.target_url).toBe(testUrl);
            expect(savedRecord.timestamp).toBeLessThanOrEqual(Date.now());

            // Validar formato estricto "iv:ciphertext" en Base64
            expect(savedRecord.content_saved).toContain(':');
            const [iv, ciphertext] = savedRecord.content_saved.split(':');
            expect(iv.length).toBeGreaterThan(0);
            expect(ciphertext.length).toBeGreaterThan(0);

            // Comprobar que el texto plano NO está en la base de datos
            expect(savedRecord.content_saved).not.toContain(testContent);
        });
    });

    describe('getDecryptedRecoveryHistory()', () => {
        it('[Happy Path] Debe recuperar y descifrar con éxito un registro almacenado', async () => {
            const originalText = 'Texto ultra confidencial para el LLM';
            const testUrl = 'https://aistudio.google.com/';

            // 1. Guardamos de forma real
            await addRecoveryHistorySecure(testUrl, originalText);
            const records = await db.recovery_history.toArray();
            const savedId = records[0].id!;

            // 2. Recuperamos y desciframos
            const decryptedText = await getDecryptedRecoveryHistory(savedId);

            expect(decryptedText).toBe(originalText);
        });

        it('[Edge Case] Debe retornar null si el registro solicitado no existe', async () => {
            const result = await getDecryptedRecoveryHistory(9999);
            expect(result).toBeNull();
        });

        it('[Security Check] Debe retornar null ante un formato de datos comprometido', async () => {
            // Inyección manual de datos corruptos directamente en la DB en memoria
            const corruptId = await db.recovery_history.add({
                timestamp: Date.now(),
                target_url: 'https://malicious.com',
                content_saved: 'payload_malicioso_sin_formato_cifrado' // Faltan los ':'
            });

            const result = await getDecryptedRecoveryHistory(corruptId);

            expect(result).toBeNull();
        });

        it('[Failure Path] Debe retornar null si la Web Crypto falla al descifrar (Clave incorrecta o Datos corruptos)', async () => {
            // Guardamos datos que SÍ tienen el formato iv:ciphertext, pero son Base64 basura
            const corruptId = await db.recovery_history.add({
                timestamp: Date.now(),
                target_url: 'https://error-test.com',
                content_saved: 'YmFzZTY0X2l2X2ZhbHNv:YmFzZTY0X2NpcGhlcl9mYWxzbw=='
            });

            // Evitamos que el test llene la consola con el console.error esperado
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
            });

            const result = await getDecryptedRecoveryHistory(corruptId);

            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });
});