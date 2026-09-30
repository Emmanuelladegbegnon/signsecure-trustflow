import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'], // évite de ramasser aussi des .test.js compilés dans dist/
    environment: 'node',
    env: {
      DATABASE_URL: 'file:./prisma/test.db',
      JWT_SECRET: 'test-secret-do-not-use-in-prod',
      OTP_PROVIDER: 'test',
      // Jamais d'envoi réel pendant les tests, quel que soit le .env local.
      EMAIL_PROVIDER: 'test',
      SMS_PROVIDER: 'simulation',
      SCHEDULER_ENABLED: 'false',
      // Fichiers et cachet de test isolés du dossier de dev, supprimés en fin de suite (globalSetup).
      UPLOAD_DIR: './.test-uploads',
      SEAL_P12_PATH: './.test-uploads/cachet-test.p12',
      FILE_ENCRYPTION_KEY: '0f'.repeat(32),
      TSA_URL: '',
      BACKUP_DIR: './.test-uploads/sauvegardes',
      BACKUP_KEY: 'ab'.repeat(32),
      FILE_ENCRYPTION_KEYS: '',
    },
    globalSetup: ['./src/test/globalSetup.ts'],
    pool: 'threads', // 'forks' (child_process) est instable dans cet environnement Windows sandboxé (voir frontend/vite.config.ts, même choix)
    fileParallelism: false, // une seule base SQLite de test partagée par tous les fichiers — pas d'exécution concurrente
  },
})
