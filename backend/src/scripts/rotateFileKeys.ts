/**
 * Rechiffre tous les fichiers stockés avec la clé en service (la première de
 * FILE_ENCRYPTION_KEYS). À lancer après avoir ajouté une nouvelle clé en tête
 * du trousseau, par exemple :
 *
 *   FILE_ENCRYPTION_KEYS="v2:<nouvelle>,v1:<ancienne>"   puis   npm run rotate-keys
 *
 * Une fois le script terminé sans erreur, l'ancienne clé peut être retirée du
 * trousseau. Les fichiers déjà chiffrés avec la clé en service sont ignorés,
 * les fichiers encore en clair sont chiffrés. Écriture atomique (fichier
 * temporaire puis renommage) : une interruption ne corrompt aucun fichier.
 */
import { readdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { env } from '../env.js'
import { currentKeyId, decryptBuffer, encryptBuffer, keyIdOf } from '../lib/fileCrypto.js'

const ENCRYPTED_DIRS = ['documents', 'trace', 'incidents', 'comparaisons']

async function main() {
  const target = currentKeyId()
  if (!target) throw new Error('Aucune clé en service : définissez FILE_ENCRYPTION_KEYS (ou FILE_ENCRYPTION_KEY).')

  const counts = { rechiffres: 0, dejaAJour: 0 }
  for (const dir of ENCRYPTED_DIRS) {
    const full = path.resolve(env.uploadDir, dir)
    const entries = await readdir(full).catch(() => [] as string[])
    for (const name of entries) {
      if (name.endsWith('.tmp')) continue
      const file = path.join(full, name)
      const stored = await readFile(file)
      if (keyIdOf(stored) === target) {
        counts.dejaAJour++
        continue
      }
      const reencrypted = encryptBuffer(decryptBuffer(stored))
      await writeFile(`${file}.tmp`, reencrypted)
      await rename(`${file}.tmp`, file)
      counts.rechiffres++
    }
  }
  console.log(`Rotation terminée vers la clé « ${target} » : ${counts.rechiffres} fichier(s) rechiffré(s), ${counts.dejaAJour} déjà à jour.`)
}

main().catch((err) => {
  console.error('Échec de la rotation :', err instanceof Error ? err.message : err)
  process.exit(1)
})
