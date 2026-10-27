/**
 * Chiffrement des fichiers au repos (PDF, photos, scans) — AES-256-GCM.
 * Chaque fichier a son propre IV aléatoire ; le tag GCM rend détectable toute
 * modification du fichier chiffré sur disque (le déchiffrement échoue).
 *
 * Changement de clé prévu : chaque fichier porte l'identifiant de la clé qui
 * l'a chiffré. FILE_ENCRYPTION_KEYS liste les clés « id:hex » séparées par des
 * virgules, la première étant la clé en service ; les suivantes ne servent
 * plus qu'à relire les anciens fichiers, jusqu'à ce que `npm run rotate-keys`
 * les ait rechiffrés avec la nouvelle.
 *
 * Formats sur disque :
 *   SSENC2 | longueur id (1 octet) | id | IV (12) | tag (16) | données  (actuel)
 *   SSENC1 | IV | tag | données — ancienne clé unique FILE_ENCRYPTION_KEY (id "v1")
 *   sans en-tête — fichier antérieur au chiffrement, lu tel quel
 *
 * Limite assumée pour le MVP : les clés sont des variables d'environnement du
 * même serveur — protège contre la fuite d'une sauvegarde ou du disque seul,
 * pas contre une compromission complète du serveur.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { env } from '../env.js'

const MAGIC_V1 = Buffer.from('SSENC1', 'ascii')
const MAGIC_V2 = Buffer.from('SSENC2', 'ascii')
const IV_LENGTH = 12
const TAG_LENGTH = 16
const LEGACY_KEY_ID = 'v1'

interface KeyRing {
  currentId: string | null
  keys: Map<string, Buffer>
}

let ring: KeyRing | null = null

function parseKey(id: string, hex: string): Buffer {
  const key = Buffer.from(hex.trim(), 'hex')
  if (key.length !== 32 || !/^[A-Za-z0-9_-]{1,32}$/.test(id)) {
    throw new Error(`Clé de chiffrement « ${id} » invalide : attendu id:64 caractères hexadécimaux.`)
  }
  return key
}

function keyRing(): KeyRing {
  if (ring) return ring
  const keys = new Map<string, Buffer>()
  let currentId: string | null = null
  if (env.fileEncryptionKeys) {
    for (const entry of env.fileEncryptionKeys.split(',').map((e) => e.trim()).filter(Boolean)) {
      const [id, hex] = entry.split(':')
      if (!id || !hex) throw new Error('FILE_ENCRYPTION_KEYS doit être de la forme "v2:hex,v1:hex".')
      keys.set(id, parseKey(id, hex))
      currentId ??= id
    }
  }
  // Ancienne variable à clé unique : toujours acceptée, sous l'id "v1".
  if (env.fileEncryptionKey && !keys.has(LEGACY_KEY_ID)) {
    keys.set(LEGACY_KEY_ID, parseKey(LEGACY_KEY_ID, env.fileEncryptionKey))
    currentId ??= LEGACY_KEY_ID
  }
  ring = { currentId, keys }
  return ring
}

/** Réservé aux tests et au script de rotation : relit les variables d'environnement. */
export function resetKeyRing() {
  ring = null
}

export function isFileEncryptionEnabled(): boolean {
  return keyRing().currentId !== null
}

export function currentKeyId(): string | null {
  return keyRing().currentId
}

export function encryptBuffer(plain: Buffer): Buffer {
  const { currentId, keys } = keyRing()
  if (!currentId) return plain
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', keys.get(currentId)!, iv)
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()])
  const id = Buffer.from(currentId, 'ascii')
  return Buffer.concat([MAGIC_V2, Buffer.from([id.length]), id, iv, cipher.getAuthTag(), encrypted])
}

/** Identifiant de la clé qui a chiffré ce contenu (null = en clair). */
export function keyIdOf(stored: Buffer): string | null {
  if (stored.subarray(0, 6).equals(MAGIC_V2)) return stored.subarray(7, 7 + stored[6]!).toString('ascii')
  if (stored.subarray(0, 6).equals(MAGIC_V1)) return LEGACY_KEY_ID
  return null
}

export function decryptBuffer(stored: Buffer): Buffer {
  const keyId = keyIdOf(stored)
  if (keyId === null) return stored // fichier antérieur au chiffrement
  const key = keyRing().keys.get(keyId)
  if (!key) throw new Error(`Fichier chiffré avec la clé « ${keyId} », absente de FILE_ENCRYPTION_KEYS : impossible de le lire.`)
  const offset = stored.subarray(0, 6).equals(MAGIC_V2) ? 7 + stored[6]! : MAGIC_V1.length
  const iv = stored.subarray(offset, offset + IV_LENGTH)
  const tag = stored.subarray(offset + IV_LENGTH, offset + IV_LENGTH + TAG_LENGTH)
  const data = stored.subarray(offset + IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()])
}
