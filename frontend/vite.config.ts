/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // pool 'forks' (child_process) times out spawning workers in this sandboxed
    // Windows environment; 'threads' avoids the per-file process spawn entirely.
    pool: 'threads',
  },
})
