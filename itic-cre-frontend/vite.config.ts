import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'

// Identifiant du build : le commit en CI (GITHUB_SHA), sinon l'heure du build. Injecté dans la page (__APP_BUILD_ID__)
// et publié dans /version.json, que l'application relit pour savoir si une autre version est en ligne.
const BUILD_ID = process.env.GITHUB_SHA ? process.env.GITHUB_SHA.slice(0, 12) : `local-${Date.now()}`

function versionFile(): Plugin {
  return {
    name: 'cre-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ buildId: BUILD_ID }) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  server: {
    host: true,
    port: 5173,
  },
  plugins: [
    react(),
    tailwindcss(),
    versionFile(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
        suppressWarnings: true,
        type: 'module'
      },
      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-icon-512x512.png'
      ],
      manifest: {
        name: 'ITIC Paris CRE — Suivi Alternance & Stages',
        short_name: 'ITIC Paris CRE',
        description: 'Plateforme mobile de suivi des candidatures et accompagnement ITIC Paris.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // version.json n'est jamais précaché (extension json absente de la liste) : il doit toujours venir du réseau.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Exclure de l'interception SPA Service Worker pour éviter les redirections React :
        // - L'API backend (/api/)
        // - Les dashboards de monitoring (/status, /netdata)
        // - La documentation OpenAPI / Swagger (/swagger-ui, /v3/api-docs)
        // - Les endpoints Actuator (/actuator)
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/status/,
          /^\/netdata/,
          /^\/swagger-ui/,
          /^\/v3\/api-docs/,
          /^\/actuator/
        ],
        runtimeCaching: [
          // 1. Polices Google Fonts (CacheFirst - 1 an)
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // 2. Requêtes API ITIC-CRE (NetworkFirst avec fallback cache si réseau indisponible).
          //    Sauf l'assistant de CV : un brouillon servi depuis le cache porterait une version
          //    périmée (409 au prochain enregistrement) et l'aperçu doit refléter la saisie en cours.
          {
            urlPattern: /\/api\/v1\/(?!cv\/builder\/).*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  envPrefix: 'REACT_APP_',
})
