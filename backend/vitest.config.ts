import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    env: { DATABASE_URL: 'file:./prisma/test.db', JWT_SECRET: 'test-secret-do-not-use-in-prod', OTP_PROVIDER: 'test' },
    globalSetup: ['./src/test/globalSetup.ts'],
    pool: 'threads', // 'forks' (child_process) est instable dans cet environnement Windows sandboxé (voir frontend/vite.config.ts, même choix)
    fileParallelism: false, // une seule base SQLite de test partagée par tous les fichiers — pas d'exécution concurrente
  },
})
