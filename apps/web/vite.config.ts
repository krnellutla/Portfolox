import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const apiBaseUrl = process.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // changeOrigin: false preserves the browser's original Host header so
      // the API's host-based tenant resolution sees the real tenant host
      // (e.g. a tenant domain mapped via /etc/hosts), not the proxy target.
      '/auth': { target: apiBaseUrl, changeOrigin: false },
      '/nodes': { target: apiBaseUrl, changeOrigin: false },
    },
  },
});
