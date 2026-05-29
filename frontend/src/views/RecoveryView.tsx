import {useEffect, useState} from 'react';
import {useMessageBus} from '../hooks/useMessageBus';
import {getDecryptedRecoveryHistory, type RecoveryHistory} from '../db/database';

interface RecoveryViewProps {
    onNavigate: (view: 'main' | 'form' | 'settings' | 'recovery') => void;
}

// Tipo extendido para gestionar el estado de descifrado local en memoria
interface DisplayRecoveryHistory extends RecoveryHistory {
    decryptedContent?: string;
}

export const RecoveryView = ({onNavigate}: RecoveryViewProps) => {
    const {sendMessage} = useMessageBus();
    const [history, setHistory] = useState<DisplayRecoveryHistory[]>([]);
    const [loadingId, setLoadingId] = useState<number | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const res = await sendMessage('GET_RECOVERY_HISTORY', {limit: 20});
                if (res.data) {
                    setHistory(res.data);
                }
            } catch (e) {
                console.error("Error al cargar historial de recuperación", e);
            }
        };
        loadHistory();
    }, [sendMessage]);

    // HU03: Desencriptación local On-Demand y copiado rápido para restaurar el contenido.
    const handleCopy = async (item: DisplayRecoveryHistory) => {
        if (!item.id) return;
        setLoadingId(item.id);
        try {
            let content = item.decryptedContent;
            if (!content) {
                const decrypted = await getDecryptedRecoveryHistory(item.id);
                if (decrypted) {
                    content = decrypted;
                    setHistory(prev => prev.map(h => h.id === item.id ? {...h, decryptedContent: decrypted} : h));
                }
            }

            if (content) {
                await navigator.clipboard.writeText(content);
                setCopiedId(item.id);
                setTimeout(() => setCopiedId(null), 2000);
            }
        } catch (e) {
            console.error("Error al descifrar o copiar el fragmento de seguridad:", e);
        } finally {
            setLoadingId(null);
        }
    };

    const formatTime = (ts: number) => {
        const rtf = new Intl.RelativeTimeFormat('es', {numeric: 'auto'});
        const daysDifference = Math.round((ts - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysDifference === 0) {
            return "Hoy, " + new Date(ts).toLocaleTimeString('es', {hour: '2-digit', minute: '2-digit'});
        }
        return rtf.format(daysDifference, 'day');
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
                <h1 className="text-lg font-semibold text-zinc-800">Red de Seguridad</h1>
            </header>

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
                <p className="text-xs text-zinc-500 mb-2 leading-relaxed">
                    Historial preventivo de instrucciones reemplazadas. El contenido huérfano es cifrado localmente
                    (AES-GCM) para tu privacidad.
                </p>

                {history.length === 0 ? (
                    <div
                        className="text-center py-12 text-zinc-500 text-sm bg-white rounded-xl border border-zinc-200 shadow-sm">
                        No hay textos huérfanos respaldados en este momento.
                    </div>
                ) : (
                    history.map((item) => (
                        <div key={item.id}
                             className="bg-white p-3 rounded-lg shadow-sm border border-zinc-200 transition-all hover:shadow-md">
                            <div className="flex justify-between items-start mb-2">
                                <div
                                    className="text-[11px] text-zinc-500 font-medium tracking-wide bg-zinc-100 px-2 py-0.5 rounded">
                                    {formatTime(item.timestamp)}
                                </div>
                                <button
                                    onClick={() => handleCopy(item)}
                                    disabled={loadingId === item.id}
                                    className="text-primary-600 hover:text-primary-700 bg-primary-50 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    {loadingId === item.id ? 'Descifrando...' : copiedId === item.id ? (
                                        <>
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                      d="M5 13l4 4L19 7"></path>
                                            </svg>
                                            Copiado</>
                                    ) : (
                                        <>
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                            </svg>
                                            Copiar / Leer</>
                                    )}
                                </button>
                            </div>
                            {item.decryptedContent ? (
                                <p className="text-xs text-zinc-700 line-clamp-4 bg-zinc-50 p-2 rounded border border-zinc-100 whitespace-pre-wrap font-mono">
                                    {item.decryptedContent}
                                </p>
                            ) : (
                                <p className="text-xs text-zinc-400 italic bg-zinc-50 p-2 rounded border border-zinc-100 text-center py-4">
                                    [🔒 Fragmento protegido]
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};