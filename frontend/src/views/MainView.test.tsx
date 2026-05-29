import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {MainView} from './MainView';
import {useMessageBus} from '../hooks/useMessageBus';

vi.mock('../hooks/useMessageBus', () => ({
    useMessageBus: vi.fn(),
}));

const mockChromeTabsQuery = vi.fn().mockResolvedValue([{id: 101}]);
const mockChromeTabsSendMessage = vi.fn();

vi.stubGlobal('chrome', {
    tabs: {
        query: mockChromeTabsQuery,
        sendMessage: mockChromeTabsSendMessage,
    },
    runtime: {
        lastError: null
    }
});

describe('MainView Component', () => {
    const mockNavigate = vi.fn();
    const mockEditProfile = vi.fn();
    const mockSendMessage = vi.fn();

    const mockProfiles = [
        {id: '1', name: 'Perfil QA', content: 'Actúa como QA', tags: ['testing']},
        {id: '2', name: 'Perfil Dev', content: 'Actúa como Dev', tags: ['codigo']}
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (useMessageBus as ReturnType<typeof vi.fn>).mockReturnValue({
            sendMessage: mockSendMessage
        });

        // CORRECCIÓN CLAVE: Proteger la instancia window de JSDOM
        vi.spyOn(window, 'close').mockImplementation(() => {
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('Debe renderizar la lista de perfiles obtenida desde el MessageBus', async () => {
        mockSendMessage.mockResolvedValue({data: mockProfiles});
        render(<MainView onNavigate={mockNavigate} onEditProfile={mockEditProfile}/>);

        await waitFor(() => {
            expect(screen.getByText('Perfil QA')).toBeInTheDocument();
            expect(screen.getByText('Perfil Dev')).toBeInTheDocument();
        });
    });

    it('Debe invocar la API de inyección y CERRAR el popup al hacer clic en "Aplicar"', async () => {
        mockSendMessage.mockResolvedValue({data: mockProfiles});
        mockChromeTabsSendMessage.mockImplementation((_tabId, _payload, cb) => cb());

        render(<MainView onNavigate={mockNavigate} onEditProfile={mockEditProfile}/>);

        await waitFor(() => {
            expect(screen.getByText('Perfil QA')).toBeInTheDocument();
        });

        const btnAplicar = screen.getAllByText('Aplicar')[0];
        fireEvent.click(btnAplicar);

        await waitFor(() => {
            expect(mockChromeTabsQuery).toHaveBeenCalled();
            expect(mockChromeTabsSendMessage).toHaveBeenCalled();
            expect(mockSendMessage).toHaveBeenCalledWith('LOG_USAGE', {id: '1'});

            // Validamos explícitamente que se intentó cerrar la ventana (UX correcto)
            expect(window.close).toHaveBeenCalledTimes(1);
        });
    });
});