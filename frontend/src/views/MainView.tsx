import {useEffect, useState} from 'react';
import {useMessageBus} from '../hooks/useMessageBus';
import type {Profile} from '../db/database';

declare const chrome: any;

interface MainViewProps {
    onNavigate: (view: 'main' | 'form' | 'settings' | 'recovery') => void;
    onEditProfile: (id: string | null) => void;
}

export const MainView = ({onNavigate, onEditProfile}: MainViewProps) => {
    const {sendMessage} = useMessageBus();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [search, setSearch] = useState('');
    const [activeTags, setActiveTags] = useState<string[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);

    useEffect(() => {
        const loadProfiles = async () => {
            try {
                const res = await sendMessage('GET_PROFILES', {query: search, tags: activeTags});
                setProfiles(res.data || []);

                // Extrae todas las etiquetas únicas para filtro solo si la vista base no está filtrada
                if (search === '' && activeTags.length === 0 && res.data) {
                    const tagsSet = new Set<string>();
                    res.data.forEach((p: Profile) => p.tags.forEach(t => tagsSet.add(t)));
                    setAllTags(Array.from(tagsSet));
                }
            } catch (e) {
                console.error("Error al cargar perfiles", e);
            }
        };

        // Implementación de debounce para mitigar inundación de peticiones y condiciones de carrera
        const timer = setTimeout(() => {
            loadProfiles();
        }, 300);

        return () => clearTimeout(timer);
    }, [search, activeTags, sendMessage]);

    const handleApply = async (profile: Profile) => {
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (tab?.id) {
                chrome.tabs.sendMessage(tab.id, {action: 'INJECT_PROFILE', payload: {profile}}, async () => {
                    if (chrome.runtime.lastError) {
                        console.warn("Content script inactivo", chrome.runtime.lastError);
                        alert("No se pudo conectar con AI Studio. Asegúrate de estar en la plataforma correcta.");
                        return;
                    }
                    await sendMessage('LOG_USAGE', {id: profile.id});
                    window.close();
                });
            }
        } catch (e) {
            console.error("Error aplicando perfil", e);
        }
    };

    const toggleTag = (tag: string) => {
        setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    return (
        <div className="flex flex-col h-full bg-zinc-50 relative">
            <header className="flex justify-between items-center p-4 border-b border-zinc-200 bg-white">
                <h1 className="text-lg font-semibold text-primary-600 tracking-tight">AI Orchestrator</h1>
                <div className="flex gap-2">
                    <button aria-label="Red de Seguridad" onClick={() => onNavigate('recovery')}
                            className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-md hover:bg-zinc-100 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </button>
                    <button aria-label="Configuración" onClick={() => onNavigate('settings')}
                            className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-md hover:bg-zinc-100 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                    </button>
                </div>
            </header>

            <div className="p-4 flex-1 overflow-y-auto">
                <div className="mb-4 space-y-3">
                    <div className="relative">
                        <svg className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor"
                             viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        <input
                            type="text"
                            placeholder="Buscar perfiles..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-white border border-zinc-300 text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                        />
                        {search && (
                            <button aria-label="Limpiar búsqueda" onClick={() => setSearch('')}
                                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        )}
                    </div>
                    {allTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {allTags.map(tag => (
                                <span
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={`px-2 py-1 text-xs font-medium rounded-md cursor-pointer border transition-colors ${activeTags.includes(tag) ? 'bg-primary-100 text-primary-800 border-primary-200' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'}`}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-3 pb-16" role="list">
                    {profiles.map(p => (
                        <div key={p.id} role="listitem"
                             className="bg-white p-3 rounded-lg shadow-sm border border-zinc-200 hover:-translate-y-0.5 hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-medium text-sm text-zinc-900 truncate pr-2">{p.name}</h3>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button aria-label="Editar Perfil" onClick={() => onEditProfile(p.id)}
                                            className="p-1 text-zinc-400 hover:text-primary-600 rounded">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{p.content}</p>
                            <div className="flex justify-between items-end">
                                <div className="flex flex-wrap gap-1">
                                    {p.tags.map(t => <span key={t}
                                                           className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[10px] font-medium">{t}</span>)}
                                </div>
                                <button onClick={() => handleApply(p)}
                                        className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus:ring-2 focus:ring-primary-500 focus:outline-none focus:ring-offset-1">
                                    Aplicar
                                </button>
                            </div>
                        </div>
                    ))}
                    {profiles.length === 0 && (
                        <div
                            className="text-center py-10 text-zinc-500 text-sm border-2 border-dashed border-zinc-200 rounded-lg">
                            No se encontraron perfiles.
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={() => onEditProfile(null)}
                className="absolute bottom-5 right-5 w-12 h-12 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label="Nuevo Perfil"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
            </button>
        </div>
    );
};