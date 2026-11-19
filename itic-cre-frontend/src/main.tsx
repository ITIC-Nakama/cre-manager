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
import { startVersionWatcher } from './pwa/versionWatcher'

// Identifiant du build (commit), aussi publié dans /version.json : sert à repérer qu'une autre version est en ligne.
document.documentElement.dataset.build = __APP_BUILD_ID__;
let swRegistration: ServiceWorkerRegistration | undefined;

// Auto-update du Service Worker en arrière-plan avec alerte Toast
registerSW({
  immediate: true,
  onNeedRefresh() {
    toast.info(i18n.t('pwa.update_available'));
  },
  // La recherche de mise à jour est pilotée par startVersionWatcher (ci-dessous) : toutes les 5 minutes, au retour sur
  // l'onglet et quand un morceau de l'application ne se charge plus, jamais pendant une saisie.
  onRegisteredSW(_swUrl, registration) {
    swRegistration = registration;
  },
});

// Rechargement automatique quand une autre version est en ligne (incident du 19/11 : un poste resté sur l'ancienne
// version en cache). Inactif en développement (pas de /version.json).
if (import.meta.env.PROD) {
  startVersionWatcher({ currentBuildId: __APP_BUILD_ID__, getRegistration: () => swRegistration });
}

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
