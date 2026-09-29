/**
 * Prépare une base SQLite dédiée aux tests (jamais dev.db) avant l'exécution
 * de la suite, et la supprime ensuite. `vitest.config.ts` injecte
 * DATABASE_URL=file:./prisma/test.db dans l'environnement des workers.
 */
import { execSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import path from 'node:path'

const TEST_DB_PATH = path.resolve(import.meta.dirname, '../../prisma/test.db')
const TEST_DATABASE_URL = 'file:./prisma/test.db'
const TEST_UPLOAD_DIR = path.resolve(import.meta.dirname, '../../.test-uploads')

export async function setup() {
  if (existsSync(TEST_DB_PATH)) rmSync(TEST_DB_PATH)
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: path.resolve(import.meta.dirname, '../..'),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'ignore',
  })
}

export async function teardown() {
  if (existsSync(TEST_DB_PATH)) rmSync(TEST_DB_PATH)
  if (existsSync(TEST_UPLOAD_DIR)) rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true })
}
