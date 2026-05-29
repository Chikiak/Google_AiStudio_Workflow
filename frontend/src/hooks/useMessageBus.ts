import {useCallback} from 'react';

declare const chrome: any;

export function useMessageBus() {
    const sendMessage = useCallback(async <T = any>(action: string, payload?: any): Promise<T> => {
        return new Promise((resolve, reject) => {
            if (typeof chrome === 'undefined' || !chrome.runtime) {
                return reject(new Error('Extension context not found'));
            }
            chrome.runtime.sendMessage({action, payload}, (response: any) => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                if (response?.status === 'error') {
                    return reject(new Error(response.message || 'Error en Service Worker'));
                }
                resolve(response as T);
            });
        });
    }, []);

    return {sendMessage};
}