import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all network addresses (0.0.0.0) for multi-device local network testing
    port: 5180,
    strictPort: true,
    allowedHosts: true, // Allow tunnel domains and external mobile devices
    proxy: {
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:5050',
        ws: true
      }
    }
  }
});
