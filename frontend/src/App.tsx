import './App.css';

// 1. Definimos la configuración para evitar repeticiones (Single Source of Truth)
const COLOR_PALETTE = [
    {title: 'Primary', bgColor: 'bg-primary-500', label: 'Pr'},
    {title: 'Background (Zinc)', bgColor: 'bg-zinc-500', label: 'Zi'},
    {title: 'Success', bgColor: 'bg-success-500', label: 'Su'},
    {title: 'Warning', bgColor: 'bg-warning-500', label: 'Wa'},
    {title: 'Error', bgColor: 'bg-error-500', label: 'Er'},
];

function App() {
    return (
        <div className="flex flex-col h-full bg-zinc-50 p-5 font-sans">
            <header className="mb-6 border-b border-zinc-200 pb-4">
                <h1 className="text-xl font-semibold text-primary-600 tracking-tight">
                    AI Context Orchestrator
                </h1>
                <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
                    Configuración base (MV3 + Tailwind) cargada y operativa.
                </p>
            </header>

            <main className="flex-1 flex flex-col gap-5">
                <section className="p-4 bg-white rounded-xl shadow-sm border border-zinc-200">
                    <h2 className="text-sm font-medium text-zinc-800 mb-3">
                        Paleta de Colores Semántica
                    </h2>
                    <div className="flex gap-3">
                        {COLOR_PALETTE.map(({title, bgColor, label}) => (
                            <div
                                key={title}
                                title={title}
                                className={`w-10 h-10 rounded-md ${bgColor} flex items-center justify-center text-white text-xs shadow-sm font-medium`}
                            >
                                {label}
                            </div>
                        ))}
                    </div>
                </section>

                <section className="p-4 bg-white rounded-xl shadow-sm border border-zinc-200">
                    <h2 className="text-sm font-medium text-zinc-800 mb-2">
                        Sistema Tipográfico
                    </h2>
                    <p className="text-sm text-zinc-600">
                        Renderizando fuentes base: <span className="font-semibold text-zinc-800">Inter / Roboto</span>.
                        Enfoque visual minimalista aplicado correctamente.
                    </p>
                </section>
            </main>
        </div>
    );
}

export default App;