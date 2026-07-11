import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Capacitor serves the built app from the local filesystem inside the WebView,
// so all asset URLs must be relative (base: './') rather than absolute ('/').
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
