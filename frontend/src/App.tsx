import {useState} from 'react';
import {MainView} from './views/MainView';
import {FormView} from './views/FormView';
import {SettingsView} from './views/SettingsView';
import {RecoveryView} from './views/RecoveryView';
import './App.css';

type View = 'main' | 'form' | 'settings' | 'recovery';

function App() {
    const [currentView, setCurrentView] = useState<View>('main');
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

    const handleNavigate = (view: View) => {
        setCurrentView(view);
    };

    const handleEditProfile = (id: string | null) => {
        setSelectedProfileId(id);
        setCurrentView('form');
    };

    return (
        <div
            className="flex-1 w-full flex flex-col relative overflow-hidden font-sans antialiased bg-zinc-50 text-zinc-900">
            {(() => {
                switch (currentView) {
                    case 'form':
                        return <FormView onNavigate={handleNavigate} profileId={selectedProfileId}/>;
                    case 'settings':
                        return <SettingsView onNavigate={handleNavigate}/>;
                    case 'recovery':
                        return <RecoveryView onNavigate={handleNavigate}/>;
                    case 'main':
                    default:
                        return <MainView onNavigate={handleNavigate} onEditProfile={handleEditProfile}/>;
                }
            })()}
        </div>
    );
}

export default App;