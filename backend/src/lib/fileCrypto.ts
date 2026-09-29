/**
 * Chiffrement des fichiers au repos (PDF, photos, scans) — AES-256-GCM avec
 * la clé FILE_ENCRYPTION_KEY (32 octets en hex). Chaque fichier a son propre
 * IV aléatoire ; le tag GCM rend détectable toute modification du fichier
 * chiffré sur disque (le déchiffrement échoue).
 *
 * Format sur disque : "SSENC1" (6 octets) | IV (12) | tag (16) | données chiffrées.
 * Un fichier sans cet en-tête est lu tel quel : compatibilité avec les
 * fichiers déposés avant l'activation du chiffrement.
 *
 * Limite assumée pour le MVP : la clé est une variable d'environnement du
 * même serveur — protège contre la fuite d'une sauvegarde ou du disque seul,
 * pas contre une compromission complète du serveur.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { env } from '../env.js'

const MAGIC = Buffer.from('SSENC1', 'ascii')
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getKey(): Buffer | null {
  if (!env.fileEncryptionKey) return null
  const key = Buffer.from(env.fileEncryptionKey, 'hex')
  if (key.length !== 32) {
    throw new Error('FILE_ENCRYPTION_KEY doit contenir 64 caractères hexadécimaux (32 octets).')
  }
  return key
}

export function isFileEncryptionEnabled(): boolean {
  return getKey() !== null
}

export function encryptBuffer(plain: Buffer): Buffer {
  const key = getKey()
  if (!key) return plain
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()])
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), encrypted])
}

export function decryptBuffer(stored: Buffer): Buffer {
  if (stored.length < MAGIC.length || !stored.subarray(0, MAGIC.length).equals(MAGIC)) {
    return stored // fichier antérieur au chiffrement
  }
  const key = getKey()
  if (!key) throw new Error('Fichier chiffré mais FILE_ENCRYPTION_KEY absente : impossible de le lire.')
  const iv = stored.subarray(MAGIC.length, MAGIC.length + IV_LENGTH)
  const tag = stored.subarray(MAGIC.length + IV_LENGTH, MAGIC.length + IV_LENGTH + TAG_LENGTH)
  const data = stored.subarray(MAGIC.length + IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()])
}
