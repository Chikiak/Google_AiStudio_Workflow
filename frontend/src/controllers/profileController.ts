import {db, generateUUID, type Profile} from '../db/database';

/**
 * Retorna los perfiles activos, ordenados por último uso y opcionalmente filtrados.
 * Mitiga fallas de Type Confusion validando estrictamente los tipos de entrada.
 */
export const getProfiles = async (payload: any) => {
    const {query, tags} = payload || {};

    let collection = db.profiles.orderBy('last_used_at').reverse().filter(p => !p.deleted_at);

    if (typeof query === 'string' && query.trim() !== '') {
        const lowerQuery = query.toLowerCase();
        collection = collection.filter(p =>
            p.name.toLowerCase().includes(lowerQuery) ||
            p.content.toLowerCase().includes(lowerQuery)
        );
    }

    if (Array.isArray(tags) && tags.length > 0) {
        const stringTags = tags.filter((t: any) => typeof t === 'string');
        if (stringTags.length > 0) {
            collection = collection.filter(p => stringTags.some((t: string) => p.tags.includes(t)));
        }
    }

    const profiles = await collection.toArray();

    return {status: "ok", data: profiles};
};

export interface ProfilePayload {
    id?: string;
    name?: string;
    content?: string;
    tags?: string[];
}

/**
 * Crea o actualiza un perfil (Upsert) sanitizando la entrada de datos.
 */
export const saveProfile = async (payload: ProfilePayload | null | undefined) => {
    if (!payload) {
        return {status: "error", message: "Payload inválido o ausente"};
    }

    const now = Date.now();

    // Mitigación TS18048: Obtenemos el ID limpio usando encadenamiento opcional
    const rawId = payload.id?.trim();
    // Si rawId es vacío o no existe, es un nuevo registro
    const isNew = !rawId;
    // Si rawId tiene valor, lo usa; de lo contrario, genera uno nuevo
    const id = rawId || generateUUID();

    // Sanitización segura con predicado de tipo estricto para asegurar string[]
    const sanitizedTags = Array.isArray(payload.tags)
        ? payload.tags.filter((t): t is string => typeof t === 'string')
        : [];

    const profile: Profile = {
        id,
        name: typeof payload.name === 'string' ? payload.name : "Nuevo Perfil",
        content: typeof payload.content === 'string' ? payload.content : "",
        tags: sanitizedTags,
        usage_count: 0,
        last_used_at: 0,
        updated_at: now,
        deleted_at: null
    };

    if (!isNew) {
        const existing = await db.profiles.get(id);

        if (existing) {
            profile.usage_count = existing.usage_count;
            profile.last_used_at = existing.last_used_at;

            profile.name = payload.name !== undefined ? payload.name : existing.name;
            profile.content = payload.content !== undefined ? payload.content : existing.content;
            profile.tags = payload.tags !== undefined ? sanitizedTags : existing.tags;
        }
    }

    await db.profiles.put(profile);

    return {status: "ok", data: {id}};
};

/**
 * Realiza un Soft-Delete del perfil para futuras sincronizaciones en la nube.
 */
export const deleteProfile = async (payload: any) => {
    if (!payload || typeof payload.id !== 'string' || payload.id.trim() === '') {
        return {status: "error", message: "Se requiere un ID válido"};
    }

    const now = Date.now();
    await db.profiles.update(payload.id, {deleted_at: now, updated_at: now});
    return {status: "ok"};
};

/**
 * Incrementa el contador de uso y la fecha del último uso de un perfil.
 */
export const logUsage = async (payload: any) => {
    if (!payload || typeof payload.id !== 'string' || payload.id.trim() === '') {
        return {status: "error", message: "Se requiere un ID válido"};
    }

    const profile = await db.profiles.get(payload.id);
    if (profile) {
        const now = Date.now();
        await db.profiles.update(payload.id, {
            usage_count: profile.usage_count + 1,
            last_used_at: now,
            updated_at: now
        });
    }
    return {status: "ok"};
};

/**
 * Exporta todos los perfiles activos a un string codificado en base64 (JSON)
 * utilizando una serialización segura y compatible.
 */
export const exportData = async () => {
    const activeProfiles = await db.profiles.filter(p => !p.deleted_at).toArray();
    const jsonStr = JSON.stringify(activeProfiles);
    const bytes = new TextEncoder().encode(jsonStr);

    const binString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');

    const base64 = btoa(binString);
    return {status: "ok", data: `data:application/json;base64,${base64}`};
};

/**
 * Importa perfiles a partir de un JSON válido, aplicando un mapeo estricto del esquema
 * para prevenir Mass Assignment y contaminación de prototipos.
 */
export const importData = async (payload: any) => {
    try {
        if (!payload || typeof payload.raw_json !== 'string') {
            return {status: "error", message: "Falta el JSON de origen o no es válido"};
        }

        const profiles: any[] = JSON.parse(payload.raw_json);
        if (!Array.isArray(profiles)) {
            return {status: "error", message: "El esquema no es un arreglo válido"};
        }

        let importedCount = 0;
        const now = Date.now();

        await db.transaction('rw', db.profiles, async () => {
            for (const p of profiles) {
                if (!p || typeof p.id !== 'string' || p.id.trim() === '') {
                    continue;
                }

                const safeProfile: Profile = {
                    id: p.id,
                    name: typeof p.name === 'string' ? p.name : "Perfil Importado",
                    content: typeof p.content === 'string' ? p.content : "",
                    tags: Array.isArray(p.tags) ? p.tags.filter((t: any) => typeof t === 'string') : [],
                    usage_count: typeof p.usage_count === 'number' && p.usage_count >= 0 ? p.usage_count : 0,
                    last_used_at: typeof p.last_used_at === 'number' && p.last_used_at >= 0 ? p.last_used_at : 0,
                    updated_at: now,
                    deleted_at: (typeof p.deleted_at === 'number' && p.deleted_at > 0) ? p.deleted_at : null
                };

                await db.profiles.put(safeProfile);
                importedCount++;
            }
        });

        return {status: "ok", imported_count: importedCount};
    } catch (err) {
        return {status: "error", message: "Invalid schema"};
    }
};