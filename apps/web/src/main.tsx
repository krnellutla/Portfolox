import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import './index.css';
import { queryClient } from './lib/query-client.js';

// Site-wide image protection: suppress right-click context menu and native
// drag-to-desktop on every <img>. Runs in capture phase so it fires before
// any React synthetic handler and catches images rendered outside React trees.
function blockImageSave(e: MouseEvent | DragEvent) {
  if (e.target instanceof HTMLImageElement) e.preventDefault();
}
document.addEventListener('contextmenu', blockImageSave, true);
document.addEventListener('dragstart', blockImageSave, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
