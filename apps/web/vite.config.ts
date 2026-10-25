import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Where the dev server proxies API routes to. Independent of
// VITE_API_BASE_URL (the browser-facing base URL, which defaults to '' so
// requests stay same-origin and go through this proxy).
const apiProxyTarget = process.env.VITE_DEV_API_PROXY_TARGET ?? 'http://localhost:3001';

// Regex covering every registered API route group. Using a regex key avoids
// an /api prefix rewrite, which would require coordinating AUTH_COOKIE_PATH
// across environments. changeOrigin: false preserves the browser's Host header
// so host-based tenant resolution sees the real tenant host, not the proxy target.
const API_ROUTES = '^/(auth|health|nodes|media|discover|photographers|photos|search|plans|community|conversations|client|me|tenant-settings|galleries|analytics|studio-orders|google-photos)(/|$)';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      [API_ROUTES]: { target: apiProxyTarget, changeOrigin: false },
    },
  },
});
