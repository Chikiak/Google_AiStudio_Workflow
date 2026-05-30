console.log("AI Context Orchestrator: Content Script inyectado y activo.");

/**
 * Localiza de forma robusta el área de texto correspondiente a las "System Instructions".
 * Utiliza una heurística basada en accesibilidad y convenciones semánticas.
 */
const findSystemInstructionInput = () => {
    const textareas = document.querySelectorAll('textarea, [contenteditable="true"]');
    const pattern = /(system|sistema|instructions|instrucciones)/i; // RegEx compilada una vez

    for (const ta of textareas) {
        const ph = ta.getAttribute('placeholder') || '';
        const al = ta.getAttribute('aria-label') || '';
        const testId = ta.getAttribute('data-test-id') || '';

        // Búsqueda insensible a mayúsculas usando RegEx optimizada (Early Return)
        if (pattern.test(ph) || pattern.test(al) || /system/i.test(testId)) {
            return ta;
        }
    }
    return null;
};

/**
 * Inyecta texto usando el setter nativo para ser reconocido por plataformas SPA (React/Angular).
 */
const setNativeValue = (element, value) => {
    if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
        // Derivación directa al prototipo nativo saltando posibles wrappers
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;

        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(element, value);
        } else if (valueSetter) {
            valueSetter.call(element, value);
        } else {
            element.value = value;
        }
    } else {
        // Fallback para elementos contenteditable
        element.textContent = value;
    }

    // Disparo explícito de eventos para forzar el re-render en la vista de la web host
    element.dispatchEvent(new Event('input', {bubbles: true}));
    element.dispatchEvent(new Event('change', {bubbles: true}));
};

/**
 * Aplica el perfil e integra la red de seguridad de forma preventiva.
 */
const applyProfile = async (profile, isFromAssistant = false, targetElement = null) => {
    const input = targetElement || findSystemInstructionInput();
    if (!input) {
        console.warn("AI Context Orchestrator: No se encontró el área de texto destino.");
        return false;
    }

    const currentValue = input.value || input.textContent || '';

    // HU03: Respaldo preventivo de texto huérfano antes de sobreescribir
    if (currentValue && currentValue.trim() !== '') {
        await new Promise(resolve => {
            chrome.runtime.sendMessage({
                action: 'BACKUP_ORPHAN_TEXT',
                payload: {
                    content: currentValue,
                    target_url: window.location.href
                }
            }, resolve);
        });
    }

    // Inyectar el nuevo contenido del perfil
    setNativeValue(input, profile.content);

    // Si fue invocado directamente desde el asistente flotante, loguear uso aquí.
    if (isFromAssistant) {
        chrome.runtime.sendMessage({
            action: 'LOG_USAGE',
            payload: {id: profile.id}
        });
    }

    return true;
};

// --- Asistente Contextual Flotante (HU06) ---

/**
 * Inyecta mediante Shadow DOM un asistente rápido sin interferir en el CSS global.
 */
const injectFloatingAssistant = (inputElement) => {
    const parent = inputElement.parentElement;
    if (!parent || parent.querySelector('#ai-context-assistant-host')) return;

    // Asegurar que el contenedor padre actúe como ancla absoluta
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.position === 'static') {
        parent.style.position = 'relative';
    }

    const host = document.createElement('div');
    host.id = 'ai-context-assistant-host';
    host.style.position = 'absolute';
    host.style.right = '12px';
    host.style.top = '12px';
    host.style.zIndex = '9999';

    const shadow = host.attachShadow({mode: 'open'});

    const style = document.createElement('style');
    style.textContent = `
        .btn {
            background-color: #6366f1;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 6px 10px;
            font-size: 12px;
            font-weight: 500;
            font-family: system-ui, -apple-system, sans-serif;
            cursor: pointer;
            transition: background-color 0.2s, transform 0.1s;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .btn:hover { background-color: #4f46e5; }
        .btn:active { transform: scale(0.98); }
        .btn svg { width: 14px; height: 14px; }
    `;

    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.innerHTML = `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
        Cargar Perfil
    `;

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        // Inyectar contexto rápido consultando el perfil usado recientemente
        chrome.runtime.sendMessage({action: 'GET_PROFILES', payload: {}}, async (response) => {
            if (response?.status === 'ok' && response.data?.length > 0) {
                const topProfile = response.data[0];
                await applyProfile(topProfile, true, inputElement);
            } else {
                alert('AI Context Orchestrator: No hay perfiles guardados. Crea uno primero desde la extensión.');
            }
        });
    });

    shadow.appendChild(style);
    shadow.appendChild(btn);
    parent.appendChild(host);
};

const toggleAssistantVisibility = (inputElement) => {
    const parent = inputElement.parentElement;
    if (!parent) return;

    const host = parent.querySelector('#ai-context-assistant-host');
    const currentValue = inputElement.value || inputElement.textContent || '';

    // Solo mostrar el asistente si el área está completamente vacía
    if (currentValue.trim() === '') {
        if (!host) {
            injectFloatingAssistant(inputElement);
        } else {
            host.style.display = 'block';
        }
    } else {
        if (host) {
            host.style.display = 'none';
        }
    }
};

// --- Ciclo de Vida y Observadores de Cambios ---

let observingInput = null;

// Utilidad de Debounce para prevenir el bloqueo del Main Thread
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
};

// Referencia estática única para permitir el removeEventListener si fuera necesario
const onInputInteraction = (event) => {
    toggleAssistantVisibility(event.target);
};

const handleDOMMutations = debounce(() => {
    const input = findSystemInstructionInput();
    if (input && input !== observingInput) {
        // Limpiar eventos del nodo anterior si existía para evitar leaks
        if (observingInput) {
            observingInput.removeEventListener('input', onInputInteraction);
            observingInput.removeEventListener('keyup', onInputInteraction);
        }

        observingInput = input;
        toggleAssistantVisibility(input);

        // Añadir con la misma referencia en memoria
        input.addEventListener('input', onInputInteraction);
        input.addEventListener('keyup', onInputInteraction);
    }
}, 300);

const domObserver = new MutationObserver(handleDOMMutations);

// Iniciamos la observación en el documento entero
domObserver.observe(document.body, {childList: true, subtree: true});

// --- Bus de Mensajes: Escuchando directrices desde el Popup ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Validar que el mensaje proviene de la propia extensión
    if (sender.id !== chrome.runtime.id) {
        return false;
    }

    if (message.action === 'INJECT_PROFILE') {
        const {profile} = message.payload || {};
        if (profile && typeof profile.content === 'string') {
            applyProfile(profile, false).then((success) => {
                sendResponse({status: success ? 'ok' : 'error'});
            });
            return true; // Obligatorio para respuestas asíncronas
        }
    }
});