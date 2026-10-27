/**
 * Scan de sécurité OWASP ZAP (« baseline » : exploration + analyse passive,
 * sans attaque destructive) de l'application lancée en local.
 *
 * Prérequis : Docker Desktop démarré, backend (npm run dev) et frontend
 * (npm run dev dans frontend/) lancés.
 *
 *   npm run security:zap                  → cible http://localhost:5174
 *   npm run security:zap -- http://...    → autre cible
 *
 * Rapport : docs/securite/zap-rapport.html (+ .md), à joindre au dossier de soutenance.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const target = (process.argv[2] ?? 'http://localhost:5174').replace('localhost', 'host.docker.internal')
const reportDir = path.resolve(import.meta.dirname, '../../../docs/securite')
mkdirSync(reportDir, { recursive: true })

console.log(`Scan ZAP de ${target} — rapport dans ${reportDir}`)
const result = spawnSync(
  'docker',
  [
    'run', '--rm',
    '-v', `${reportDir}:/zap/wrk:rw`,
    'ghcr.io/zaproxy/zaproxy:stable',
    'zap-baseline.py', '-t', target, '-r', 'zap-rapport.html', '-w', 'zap-rapport.md', '-I',
  ],
  { stdio: 'inherit', shell: process.platform === 'win32' },
)
if (result.error) {
  console.error('Docker est introuvable ou arrêté : démarrez Docker Desktop, puis relancez.')
  process.exit(1)
}
process.exit(result.status ?? 0)
