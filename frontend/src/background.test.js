import {afterAll, beforeEach, describe, expect, it, vi} from 'vitest';

// Mock estructural simulando el Fluent API de Dexie.js
vi.mock('./db/database', () => ({
    db: {
        open: vi.fn().mockResolvedValue(true),
        recovery_history: {
            where: vi.fn().mockReturnThis(),
            below: vi.fn().mockReturnThis(),
            delete: vi.fn().mockResolvedValue(1)
        }
    }
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

const {processMessage} = await import('./background.js');
const listenerCallback = mockAddListener.mock.calls[0][0];

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

    it('debería manejar requests nulos y retornar error controlado', async () => {
        const response = await processMessage(null);
        expect(response.status).toBe("error");
    });
});

describe('Service Worker - Security Listener', () => {
    it('debería rechazar si el sender no tiene el ID de la extensión', () => {
        const mockSendResponse = vi.fn();
        const result = listenerCallback({action: 'PING'}, {id: 'atacante-id'}, mockSendResponse);
        expect(result).toBe(false);
        expect(mockSendResponse).toHaveBeenCalledWith(expect.objectContaining({status: "error"}));
    });
});