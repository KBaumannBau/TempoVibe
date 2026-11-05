import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' damit der fertige Ordner dist/ auf jedem Webserver und in Unterordnern läuft
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { chunkSizeWarningLimit: 1200 },
});
