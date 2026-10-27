/**
 * Test de restauration d'une sauvegarde, sans toucher à l'installation en service.
 *   npm run verify-backup -- <archive.ssbak>                 (contrôle seul)
 *   npm run verify-backup -- <archive.ssbak> <dossier vide>  (contrôle + extraction)
 */
import { prisma } from '../db.js'
import { verifyBackup } from '../lib/backup.js'

const [archive, target] = process.argv.slice(2)
if (!archive) {
  console.error('Usage : npm run verify-backup -- <archive.ssbak> [dossier-de-restauration-vide]')
  process.exit(1)
}

verifyBackup(archive, target)
  .then((r) => {
    console.log(`Archive déchiffrée : ${r.fichiersControles} éléments, ${r.fichiersEnErreur.length} en erreur.`)
    for (const j of r.journal) {
      console.log(`  Organisation ${j.organisationId} : ${j.evenements} événements, chaîne ${j.chaineIntacte ? 'intacte' : 'ROMPUE'}, dernier hash ${j.dernierHashConforme ? 'conforme' : 'DIFFÉRENT'}`)
    }
    if (r.restaureDans) console.log(`Fichiers extraits dans ${r.restaureDans}`)
    const ok = r.archiveIntegre && r.journal.every((j) => j.chaineIntacte && j.dernierHashConforme)
    console.log(ok ? 'Restauration vérifiée : sauvegarde exploitable.' : 'ATTENTION : sauvegarde incomplète ou altérée.')
    if (!ok) process.exitCode = 2
  })
  .catch((err) => {
    console.error('Échec du contrôle :', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
