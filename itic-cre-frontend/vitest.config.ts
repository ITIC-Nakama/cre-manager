import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Tests du front (Vitest + Testing Library, DOM simulé par jsdom). Séparé de vite.config.ts : pas de PWA ici.
export default defineConfig({
  plugins: [react()],
  envPrefix: 'REACT_APP_',
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    restoreMocks: true,
    testTimeout: 15_000,
  },
})
