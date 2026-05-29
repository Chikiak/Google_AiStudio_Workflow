import {useRef, useState} from 'react';
import {useMessageBus} from '../hooks/useMessageBus';

interface SettingsViewProps {
    onNavigate: (view: 'main' | 'form' | 'settings' | 'recovery') => void;
}

export const SettingsView = ({onNavigate}: SettingsViewProps) => {
    const {sendMessage} = useMessageBus();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [toast, setToast] = useState<{ message: string, type: 'info' | 'error' | 'success' } | null>(null);

    const showToast = (message: string, type: 'info' | 'error' | 'success') => {
        setToast({message, type});
        setTimeout(() => setToast(null), 3000);
    };

    const handleExport = async () => {
        try {
            const res = await sendMessage('EXPORT_DATA');
            // Validamos estrictamente el esquema del URI para prevenir inyección de código (Zero Trust)
            if (res.data && (res.data.startsWith('data:application/json') || res.data.startsWith('blob:'))) {
                const a = document.createElement('a');
                a.href = res.data;
                a.download = `ai_context_profiles_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                showToast('Exportación completada de manera exitosa', 'success');
            } else {
                throw new Error('URI de exportación inseguro o malformado.');
            }
        } catch (e) {
            console.error(e);
            showToast('Error fatal al intentar exportar los perfiles', 'error');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Prevenimos agotamiento de memoria del cliente (DoS) limitando la lectura síncrona a 5MB
        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            showToast('El archivo excede el tamaño máximo permitido (5MB)', 'error');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Defensa en profundidad: bloqueo temprano de archivos manifiestamente incorrectos
        if (file.type !== 'application/json' && !file.name.toLowerCase().endsWith('.json')) {
            showToast('Formato de archivo inválido. Se espera JSON', 'error');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result;
            if (typeof content === 'string') {
                try {
                    const res = await sendMessage('IMPORT_DATA', {raw_json: content});
                    showToast(`Importados ${res.imported_count} perfiles exitosamente.`, 'success');
                } catch (err) {
                    showToast('Esquema JSON no válido o corrupto', 'error');
                }
            }
        };
        reader.readAsText(file);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
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
                <h1 className="text-lg font-semibold text-zinc-800">Configuración</h1>
            </header>

            <div className="p-4 flex-1 space-y-6">
                <section className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                    <h2 className="font-medium text-sm text-zinc-800 mb-1">Portabilidad de Datos</h2>
                    <p className="text-xs text-zinc-500 mb-4 leading-relaxed">Exporta tu biblioteca completa o importa
                        desde un respaldo previo. Las importaciones sobrescribirán perfiles con el mismo
                        identificador.</p>

                    <div className="flex flex-col gap-3">
                        <button onClick={handleExport}
                                className="w-full flex items-center justify-center gap-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                            </svg>
                            Exportar Perfiles (JSON)
                        </button>

                        <button onClick={handleImportClick}
                                className="w-full flex items-center justify-center gap-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                            </svg>
                            Importar Perfiles (JSON)
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json"
                               className="hidden"/>
                    </div>
                </section>

                {toast && (
                    <div className={`p-3 text-xs font-medium rounded-md text-center border transition-opacity ${
                        toast.type === 'success' ? 'bg-success-50 text-success-700 border-success-200' :
                            toast.type === 'error' ? 'bg-error-50 text-error-700 border-error-200' :
                                'bg-zinc-100 text-zinc-700 border-zinc-200'
                    }`}>
                        {toast.message}
                    </div>
                )}
            </div>
        </div>
    );
};