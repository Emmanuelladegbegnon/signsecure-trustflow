/**
 * Remplace le certificat du cachet de démonstration (clé compromise, ou fin
 * de validité). L'ancien fichier .p12 est archivé dans keys/archive/ (il
 * n'est plus utilisé pour sceller) ; un nouveau certificat auto-signé est
 * généré, inscrit dans l'historique public, et le changement est écrit dans
 * le journal de chaque organisation (ce qui déclenche une alerte).
 *
 * Les documents déjà scellés restent vérifiables : leur empreinte de
 * certificat figure dans l'historique publié, avec sa période de validité.
 *
 *   npm run rotate-seal
 */
import { existsSync, mkdirSync, renameSync } from 'node:fs'
import path from 'node:path'
import { env } from '../env.js'
import { prisma } from '../db.js'
import { getSealCertificateInfo, registerSealCertificate, resetSealCache } from '../lib/pdfSeal.js'

async function main() {
  const p12Path = path.resolve(env.sealP12Path)
  if (existsSync(p12Path)) {
    const old = getSealCertificateInfo()
    const archiveDir = path.join(path.dirname(p12Path), 'archive')
    mkdirSync(archiveDir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    renameSync(p12Path, path.join(archiveDir, `${path.basename(p12Path, '.p12')}-${stamp}.p12`))
    console.log(`Ancien certificat archivé : ${old.empreinteSha256}`)
  }
  resetSealCache()
  await registerSealCertificate() // génère le nouveau .p12 et l'inscrit dans l'historique
  console.log(`Nouveau certificat en service : ${getSealCertificateInfo().empreinteSha256}`)
  console.log('Redémarrez le serveur pour qu’il utilise le nouveau certificat.')
}

main()
  .catch((err) => {
    console.error('Échec du changement de certificat :', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
