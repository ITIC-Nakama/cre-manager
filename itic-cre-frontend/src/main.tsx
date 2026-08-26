import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './i18n'
import i18n from './i18n'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'
import { toast } from 'sonner'
import { queryClient } from './queryClient'

// Auto-update du Service Worker en arrière-plan avec alerte Toast
registerSW({
  immediate: true,
  onNeedRefresh() {
    toast.info(i18n.t('pwa.update_available'));
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

// Dissolution fluide de l'écran d'accueil après chargement de React
requestAnimationFrame(() => {
  const splash = document.getElementById('pwa-splash');
  if (splash) {
    splash.classList.add('splash-fade-out');
    setTimeout(() => splash.remove(), 400);
  }
});
