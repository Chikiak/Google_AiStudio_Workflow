import {afterAll, beforeEach, describe, expect, it, vi} from 'vitest';

// 1. Setup y Mocks Globales
vi.mock('./db/database', () => ({
    db: {open: vi.fn().mockResolvedValue(true)}
}));

const mockAddListener = vi.fn();
vi.stubGlobal('chrome', {
    runtime: {
        id: 'extension-id-12345',
        onMessage: {
            addListener: mockAddListener
        }
    }
});

// 2. Importación dinámica
const {processMessage} = await import('./background.js');

// [FIX ARQUITECTÓNICO]: Extraemos el callback inmediatamente,
// ANTES de que cualquier vi.clearAllMocks() en las suites limpie el historial de llamadas.
const listenerCallback = mockAddListener.mock.calls[0][0];

// 3. Suites de Pruebas
describe('Service Worker - Message Bus (processMessage)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'warn').mockImplementation(() => {
        });
        vi.spyOn(console, 'error').mockImplementation(() => {
        });
        vi.spyOn(console, 'log').mockImplementation(() => {
        });
    });

    afterAll(() => {
        vi.restoreAllMocks();
    });

    it('debería retornar { status: "ok" } cuando la acción es PING', async () => {
        const request = {action: 'PING'};
        const response = await processMessage(request);
        expect(response).toEqual({status: "ok"});
    });

    it('debería manejar requests nulos y retornar el error de acción no soportada', async () => {
        const response = await processMessage(null);
        expect(response).toEqual({
            status: "error",
            message: "Acción no soportada: DESCONOCIDA"
        });
        expect(console.warn).toHaveBeenCalled();
    });

    it('debería retornar un mensaje de error explícito para acciones no registradas', async () => {
        const request = {action: 'UNKNOWN_ACTION'};
        const response = await processMessage(request);
        expect(response).toEqual({
            status: "error",
            message: "Acción no soportada: UNKNOWN_ACTION"
        });
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Acción no reconocida'));
    });

    it('debería capturar excepciones internas y devolver un error genérico (sin exponer datos ni sufrir Double Fault)', async () => {
        // Objeto venenoso diseñado para hacer explotar la desestructuración de JS
        const malformedRequest = {};
        Object.defineProperty(malformedRequest, 'action', {
            get: () => {
                throw new Error('Error fatal de memoria');
            }
        });

        const response = await processMessage(malformedRequest);

        // Ahora el catch atrapará el error de forma segura
        expect(response).toEqual({
            status: "error",
            message: "Error interno del Service Worker"
        });
        expect(console.error).toHaveBeenCalled();
    });
});

describe('Service Worker - Security Listener', () => {

    // Ya no necesitamos beforeAll porque el listenerCallback fue extraído globalmente de forma segura.

    it('debería rechazar inmediatamente si el sender no tiene el ID de la extensión', () => {
        const mockSendResponse = vi.fn();
        const invalidSender = {id: 'atacante-externo-id'};

        const result = listenerCallback({action: 'PING'}, invalidSender, mockSendResponse);

        expect(result).toBe(false);
        expect(mockSendResponse).toHaveBeenCalledWith({
            status: "error",
            message: "Acceso denegado: Remitente no autorizado."
        });
    });

    it('debería procesar el mensaje y retornar true si el sender es válido', () => {
        const mockSendResponse = vi.fn();
        const validSender = {id: 'extension-id-12345'};

        const result = listenerCallback({action: 'PING'}, validSender, mockSendResponse);

        expect(result).toBe(true);
    });
});