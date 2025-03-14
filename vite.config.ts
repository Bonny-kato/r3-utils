import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        lib: {
            entry: resolve(fileURLToPath(new URL('.', import.meta.url)), 'src/index.ts'),
            name: 'R3Utils',
            fileName: 'r3-utils',
            formats: ['es'],
        },
        rollupOptions: {
            external: ['react', 'react-dom', 'react-router'],
        },
    },
});
