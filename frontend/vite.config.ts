import {defineConfig} from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {crx} from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        crx({manifest}),
    ],
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/setupTests.ts'],
        globals: true,
    },
})
