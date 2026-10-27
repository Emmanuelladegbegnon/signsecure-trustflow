/**
 * Crée une sauvegarde chiffrée dans BACKUP_DIR (voir lib/backup.ts).
 *   npm run backup
 */
import { prisma } from '../db.js'
import { createBackup } from '../lib/backup.js'

createBackup()
  .then((r) => console.log(`Sauvegarde créée : ${r.fichier} (${r.fichiers} fichiers, ${Math.round(r.octets / 1024)} Ko).`))
  .catch((err) => {
    console.error('Échec de la sauvegarde :', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
