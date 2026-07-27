import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './i18n'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Auto-update du Service Worker en arrière-plan
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Nouvelle version mobile ITIC-CRE disponible, mise à jour du cache...');
  },
  onOfflineReady() {
    console.log('Application mobile ITIC-CRE prête pour une utilisation hors-ligne.');
  }
});


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
      staleTime: 30 * 1000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

