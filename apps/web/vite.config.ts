import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Where the dev server proxies /auth and /nodes to. Independent of
// VITE_API_BASE_URL (the browser-facing base URL, which defaults to '' so
// requests stay same-origin and go through this proxy).
const apiProxyTarget = process.env.VITE_DEV_API_PROXY_TARGET ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // changeOrigin: false preserves the browser's original Host header so
      // the API's host-based tenant resolution sees the real tenant host
      // (e.g. a tenant domain mapped via /etc/hosts), not the proxy target.
      '/auth': { target: apiProxyTarget, changeOrigin: false },
      '/nodes': { target: apiProxyTarget, changeOrigin: false },
    },
  },
});
