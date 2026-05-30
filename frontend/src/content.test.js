// content.test.js
// @vitest-environment jsdom
import {beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';

// 1. Simulación robusta del entorno de Chrome
beforeAll(() => {
    global.chrome = {
        runtime: {
            id: 'mock-extension-id',
            sendMessage: vi.fn((msg, cb) => {
                if (cb) cb({status: 'ok', data: [{id: 1, content: "Context AI"}]});
            }),
            onMessage: {
                addListener: vi.fn()
            }
        }
    };
});

describe('Content Script - AI Context Orchestrator', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    describe('findSystemInstructionInput()', () => {
        const pattern = /(system|sistema|instructions|instrucciones)/i;
        const findSystemInstructionInput = () => {
            const elements = document.querySelectorAll('textarea, [contenteditable="true"]');
            for (const el of elements) {
                if (pattern.test(el.getAttribute('placeholder') || '') ||
                    pattern.test(el.getAttribute('aria-label') || '') ||
                    /system/i.test(el.getAttribute('data-test-id') || '')) {
                    return el;
                }
            }
            return null;
        };

        it('[Edge Case] Debe retornar nulo si el DOM está vacío', () => {
            expect(findSystemInstructionInput()).toBeNull();
        });

        it('[Happy Path] Debe localizar por aria-label', () => {
            const ta = document.createElement('textarea');
            ta.setAttribute('aria-label', 'System Instructions');
            document.body.appendChild(ta);
            expect(findSystemInstructionInput()).toBe(ta);
        });
    });

    describe('toggleAssistantVisibility()', () => {
        // Javascript puro, sin Typescript tags
        const toggleAssistantVisibility = (inputElement) => {
            const parent = inputElement.parentElement;
            if (!parent) return;

            let host = parent.querySelector('#ai-context-assistant-host');
            const currentValue = inputElement.value || inputElement.textContent || '';

            if (currentValue.trim() === '') {
                if (!host) {
                    host = document.createElement('div');
                    host.id = 'ai-context-assistant-host';
                    parent.appendChild(host);
                } else {
                    host.style.display = 'block';
                }
            } else if (host) {
                host.style.display = 'none';
            }
        };

        it('[Happy Path] Debe inyectar el asistente si está vacío', () => {
            const wrapper = document.createElement('div');
            const input = document.createElement('textarea');
            input.value = '';
            wrapper.appendChild(input);
            document.body.appendChild(wrapper);

            toggleAssistantVisibility(input);

            const assistant = wrapper.querySelector('#ai-context-assistant-host');
            expect(assistant).toBeDefined();
            expect(assistant.style.display).not.toBe('none');
        });

        it('[Failure / Edge Case] No debe crashear si el input no tiene nodo padre', () => {
            const input = document.createElement('textarea');
            // Elemento huérfano, no anexado al DOM
            expect(() => toggleAssistantVisibility(input)).not.toThrow();
        });

        it('[Happy Path] Debe ocultar el asistente al existir texto', () => {
            const wrapper = document.createElement('div');
            const input = document.createElement('textarea');
            input.value = 'Texto de prueba';

            const host = document.createElement('div');
            host.id = 'ai-context-assistant-host';
            host.style.display = 'block';

            wrapper.appendChild(input);
            wrapper.appendChild(host);
            document.body.appendChild(wrapper);

            toggleAssistantVisibility(input);
            expect(host.style.display).toBe('none');
        });
    });
});