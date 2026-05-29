import {useEffect, useState} from 'react';
import {useMessageBus} from '../hooks/useMessageBus';
import type {Profile} from '../db/database';

interface FormViewProps {
    onNavigate: (view: 'main' | 'form' | 'settings' | 'recovery') => void;
    profileId: string | null;
}

export const FormView = ({onNavigate, profileId}: FormViewProps) => {
    const {sendMessage} = useMessageBus();
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (profileId) {
            sendMessage('GET_PROFILES', {}).then((res) => {
                const p = res.data?.find((p: Profile) => p.id === profileId);
                if (p) {
                    setName(p.name);
                    setContent(p.content);
                    setTagsInput(p.tags.join(', '));
                }
            });
        }
    }, [profileId, sendMessage]);

    const handleSave = async () => {
        if (!name.trim() || !content.trim()) return;

        setIsLoading(true);
        try {
            const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
            await sendMessage('SAVE_PROFILE', {id: profileId, name, content, tags});
            onNavigate('main');
        } catch (error) {
            console.error("Error al guardar el perfil:", error);
            // Aquí se recomienda integrar un sistema de Toasts o Notificaciones
            alert("No se pudo guardar el perfil. Inténtalo de nuevo.");
        } finally {
            // Se garantiza que el botón se rehabilite independientemente del resultado
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!profileId) return;
        if (confirm('¿Eliminar este perfil de forma permanente?')) {
            await sendMessage('DELETE_PROFILE', {id: profileId});
            onNavigate('main');
        }
    };

    return (
        <div className="flex flex-col h-full bg-zinc-50 relative">
            <header className="flex items-center p-4 border-b border-zinc-200 bg-white">
                <button aria-label="Volver" onClick={() => onNavigate('main')}
                        className="mr-3 text-zinc-500 hover:text-zinc-900 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                </button>
                <h1 className="text-lg font-semibold text-zinc-800">{profileId ? 'Editar Perfil' : 'Nuevo Perfil'}</h1>
            </header>

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
                <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Nombre</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Ej. Programador Senior"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Instrucción (Contexto)</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md text-sm resize-none h-40 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Actúa como un experto en..."
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Etiquetas (separadas por
                        comas)</label>
                    <input
                        type="text"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="código, frontend, utilidades"
                    />
                </div>
            </div>

            <div className="p-4 border-t border-zinc-200 bg-white flex justify-between items-center">
                {profileId ? (
                    <button onClick={handleDelete}
                            className="text-error-600 hover:text-error-800 text-sm font-medium px-2 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-error-500 rounded">
                        Eliminar
                    </button>
                ) : <div/>}
                <button
                    onClick={handleSave}
                    disabled={isLoading || !name.trim() || !content.trim()}
                    className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:bg-zinc-300 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    {isLoading ? 'Guardando...' : 'Guardar'}
                </button>
            </div>
        </div>
    );
};