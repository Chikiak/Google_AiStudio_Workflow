import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import App from './App';

// Mock de la API nativa de Chrome
vi.stubGlobal('chrome', {
    runtime: {
        sendMessage: vi.fn().mockImplementation((_req, cb) => cb({status: 'ok', data: []}))
    }
});

describe('App Component (Orquestador Principal)', () => {
    it('Debe renderizar la vista principal por defecto y montar la estructura base', () => {
        render(<App/>);

        // Verifica que la interfaz core (Issue #5) se ha montado correctamente
        const mainTitle = screen.getByRole('heading', {name: /AI Orchestrator/i, level: 1});
        expect(mainTitle).toBeInTheDocument();

        // Verifica la disponibilidad de la barra de búsqueda universal
        const searchInput = screen.getByPlaceholderText(/Buscar perfiles/i);
        expect(searchInput).toBeInTheDocument();

        // Verifica el montaje del FAB (Floating Action Button) de creación
        const newProfileBtn = screen.getByRole('button', {name: /Nuevo Perfil/i});
        expect(newProfileBtn).toBeInTheDocument();
    });
});