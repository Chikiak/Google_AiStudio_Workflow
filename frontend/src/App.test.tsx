import {render, screen, within} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import App from './App';

describe('App Component (MV3 Popup Base)', () => {
    it('Debe renderizar la cabecera principal y la descripción correctamente (Happy Path)', () => {
        render(<App/>);

        // Verifica que el título principal de la extensión exista y sea accesible
        const mainTitle = screen.getByRole('heading', {name: /AI Context Orchestrator/i, level: 1});
        expect(mainTitle).toBeInTheDocument();
        expect(mainTitle).toHaveClass('text-primary-600');

        // Verifica que el mensaje de configuración esté presente (validando corrección UTF-8)
        const subtitle = screen.getByText(/Configuración base \(MV3 \+ Tailwind\) cargada y operativa./i);
        expect(subtitle).toBeInTheDocument();
    });

    it('Debe renderizar todos los elementos de la paleta de colores semántica', () => {
        render(<App/>);

        const paletteSection = screen.getByRole('heading', {
            name: /Paleta de Colores Semántica/i,
            level: 2
        }).parentElement;
        expect(paletteSection).not.toBeNull();

        // Verificamos los Edge Cases de la interfaz: Asegurarnos de que no falte ningún color semántico crítico
        const expectedColors = ['Primary', 'Background (Zinc)', 'Success', 'Warning', 'Error'];

        expectedColors.forEach(colorTitle => {
            // Usamos el 'title' tag para accesibilidad e identificación unívoca
            const colorBox = within(paletteSection!).getByTitle(colorTitle);
            expect(colorBox).toBeInTheDocument();
            // Verificamos que tenga la estilización base esperada de un bloque de color
            expect(colorBox).toHaveClass('w-10', 'h-10', 'rounded-md');
        });
    });

    it('Debe mostrar la información del sistema tipográfico (Verificación Estructural)', () => {
        render(<App/>);

        expect(screen.getByRole('heading', {name: /Sistema Tipográfico/i, level: 2})).toBeInTheDocument();
        expect(screen.getByText(/Inter \/ Roboto/i)).toBeInTheDocument();
    });
});