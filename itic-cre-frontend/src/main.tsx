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
const SW_UPDATE_INTERVAL_MS = 15 * 60 * 1000;

registerSW({
  immediate: true,
  onNeedRefresh() {
    toast.info(i18n.t('pwa.update_available'));
  },
  // Le navigateur ne cherche une nouvelle version du service worker qu'à la navigation (et parfois tard) : un onglet
  // resté ouvert gardait l'ancienne version de l'application après un déploiement. On vérifie donc toutes les
  // 15 minutes et à chaque retour sur l'onglet.
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    const check = () => { if (navigator.onLine) void registration.update().catch(() => undefined); };
    setInterval(check, SW_UPDATE_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  },
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
