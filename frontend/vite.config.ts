/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Port fixe : le backend génère des liens absolus vers FRONTEND_BASE_URL
    // (invitation, signature) — un port qui dérive silencieusement si 5173 est
    // déjà pris par un autre projet casse ces liens. strictPort fait échouer
    // le démarrage plutôt que de glisser sur un autre port sans prévenir.
    port: 5174,
    strictPort: true,
    // httpClient.ts appelle VITE_API_BASE_URL ?? '/api' — ce proxy fait
    // pointer ce chemin relatif vers le backend en dev, sans CORS ni config
    // supplémentaire à faire sur chaque poste.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // pool 'forks' (child_process) times out spawning workers in this sandboxed
    // Windows environment; 'threads' avoids the per-file process spawn entirely.
    pool: 'threads',
  },
})
