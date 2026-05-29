import {beforeEach, describe, expect, it, vi} from 'vitest';
import {saveProfile} from './profileController';
import {db} from '../db/database';

vi.mock('../db/database', () => ({
    db: {
        profiles: {
            get: vi.fn(),
            put: vi.fn()
        }
    },
    generateUUID: vi.fn(() => 'mock-uuid-nuevo-123')
}));

describe('profileController - saveProfile Type Guards', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debería generar un nuevo ID si el payload.id es indefinido o ausente', async () => {
        const payloadSinId = {
            name: "Perfil Temporal",
            content: "Contenido"
        };

        const result = await saveProfile(payloadSinId);

        expect(result.status).toBe("ok");
        expect(result.data?.id).toBe("mock-uuid-nuevo-123");
        expect(db.profiles.put).toHaveBeenCalledWith(expect.objectContaining({
            id: "mock-uuid-nuevo-123",
            name: "Perfil Temporal"
        }));
    });

    it('debería generar un nuevo ID si el payload.id es un string vacío o con espacios', async () => {
        const payloadIdVacio = {
            id: "   ",
            name: "Perfil Espacial",
            content: "Contenido"
        };

        const result = await saveProfile(payloadIdVacio);

        expect(result.status).toBe("ok");
        expect(result.data?.id).toBe("mock-uuid-nuevo-123");
    });

    it('debería conservar el ID provisto si es válido y no está vacío', async () => {
        const payloadIdValido = {
            id: "mi-id-fijo",
            name: "Perfil Fijo"
        };
        vi.mocked(db.profiles.get).mockResolvedValue(null as any);

        const result = await saveProfile(payloadIdValido);

        expect(result.status).toBe("ok");
        expect(result.data?.id).toBe("mi-id-fijo");
        expect(db.profiles.put).toHaveBeenCalledWith(expect.objectContaining({
            id: "mi-id-fijo"
        }));
    });
});