/**
 * Sauvegarde chiffrée hors du serveur, et vérification de restauration.
 *
 * Une archive contient : un instantané cohérent de la base (VACUUM INTO), les
 * fichiers stockés (déjà chiffrés), les jetons d'horodatage, et un manifeste
 * (empreinte de chaque fichier, dernier hash du journal de chaque
 * organisation). L'archive entière est chiffrée en AES-256-GCM avec
 * BACKUP_KEY, une clé DISTINCTE de celle des fichiers.
 *
 * Ne sont PAS dans l'archive, et doivent être conservés à part, en lieu sûr :
 * les clés FILE_ENCRYPTION_KEYS et BACKUP_KEY, le fichier .p12 du cachet et sa
 * phrase de passe. Sans elles, une archive volée est illisible — et sans
 * elles, une restauration est impossible.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'
import { PrismaClient } from '@prisma/client'
import { env } from '../env.js'
import { prisma } from '../db.js'
import { recordAuditEvent, verifyAuditChain } from './audit.js'

const MAGIC = Buffer.from('SSBAK1', 'ascii')
const FILE_DIRS = ['documents', 'trace', 'incidents', 'comparaisons', 'horodatages']

interface Manifest {
  creeLe: string
  base: string
  fichiers: Record<string, string> // chemin relatif → SHA-256
  journal: Array<{ organisationId: string; dernierHash: string | null; evenements: number }>
}

interface Archive {
  manifest: Manifest
  contenu: Record<string, string> // chemin relatif → base64
}

function backupKey(): Buffer {
  const key = Buffer.from(env.backupKey, 'hex')
  if (key.length !== 32) throw new Error('BACKUP_KEY doit contenir 64 caractères hexadécimaux (clé distincte de FILE_ENCRYPTION_KEYS).')
  return key
}

const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex')

async function listFiles(root: string): Promise<string[]> {
  const out: string[] = []
  for (const dir of FILE_DIRS) {
    const full = path.join(root, dir)
    const names = await readdir(full).catch(() => [] as string[])
    for (const name of names) {
      if ((await stat(path.join(full, name))).isFile()) out.push(`${dir}/${name}`)
    }
  }
  return out
}

export async function createBackup(): Promise<{ fichier: string; octets: number; fichiers: number }> {
  if (!env.backupDir) throw new Error('BACKUP_DIR non défini : indiquez un dossier hors du serveur (disque externe, montage réseau).')
  const key = backupKey()
  mkdirSync(env.backupDir, { recursive: true })

  // Instantané cohérent de la base SQLite, même pendant que le serveur tourne.
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'ss-backup-'))
  const snapshot = path.join(tmp, 'base.db')
  await prisma.$executeRawUnsafe(`VACUUM INTO '${snapshot.replace(/'/g, "''")}'`)

  const uploadRoot = path.resolve(env.uploadDir)
  const archive: Archive = {
    manifest: { creeLe: new Date().toISOString(), base: '', fichiers: {}, journal: [] },
    contenu: {},
  }
  const db = await readFile(snapshot)
  archive.contenu['base.db'] = db.toString('base64')
  archive.manifest.base = sha256(db)
  for (const rel of await listFiles(uploadRoot)) {
    const data = await readFile(path.join(uploadRoot, rel))
    archive.contenu[rel] = data.toString('base64')
    archive.manifest.fichiers[rel] = sha256(data)
  }
  const orgs = await prisma.organization.findMany({ select: { id: true } })
  for (const { id } of orgs) {
    const last = await prisma.auditEvent.findFirst({ where: { organizationId: id }, orderBy: { timestampServer: 'desc' } })
    archive.manifest.journal.push({
      organisationId: id,
      dernierHash: last?.eventHash ?? null,
      evenements: await prisma.auditEvent.count({ where: { organizationId: id } }),
    })
  }
  await rm(tmp, { recursive: true, force: true })

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(gzipSync(Buffer.from(JSON.stringify(archive)))), cipher.final()])
  const out = Buffer.concat([MAGIC, iv, cipher.getAuthTag(), encrypted])
  const name = `signsecure-${archive.manifest.creeLe.replace(/[:.]/g, '-')}.ssbak`
  const target = path.join(env.backupDir, name)
  await writeFile(target, out)

  for (const { id } of orgs) {
    await recordAuditEvent({
      organizationId: id,
      actorId: null,
      actorLabel: 'Système (sauvegarde)',
      action: 'BACKUP_CREATED',
      objectType: 'Backup',
      objectId: name,
      ip: 'system',
      details: { sha256Archive: sha256(out), fichiers: Object.keys(archive.manifest.fichiers).length },
    })
  }
  return { fichier: target, octets: out.length, fichiers: Object.keys(archive.manifest.fichiers).length }
}

function openArchive(data: Buffer): Archive {
  if (!data.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Ce fichier n'est pas une sauvegarde SignSecure.")
  const iv = data.subarray(6, 18)
  const tag = data.subarray(18, 34)
  const decipher = createDecipheriv('aes-256-gcm', backupKey(), iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(data.subarray(34)), decipher.final()]) // échoue si l'archive a été modifiée
  return JSON.parse(gunzipSync(plain).toString('utf8')) as Archive
}

export interface BackupCheck {
  archiveIntegre: boolean
  fichiersControles: number
  fichiersEnErreur: string[]
  journal: Array<{ organisationId: string; chaineIntacte: boolean; evenements: number; dernierHashConforme: boolean }>
  restaureDans: string | null
}

/**
 * Test de restauration : déchiffre l'archive, contrôle chaque empreinte, ouvre
 * la base restaurée et rejoue le chaînage du journal. Avec `targetDir`, les
 * fichiers sont aussi extraits dans ce dossier (jamais sur l'installation en
 * service).
 */
export async function verifyBackup(archivePath: string, targetDir?: string): Promise<BackupCheck> {
  const archive = openArchive(await readFile(archivePath))
  const dir = targetDir ? path.resolve(targetDir) : await mkdtemp(path.join(os.tmpdir(), 'ss-restore-'))
  if (targetDir && existsSync(dir) && (await readdir(dir)).length > 0) throw new Error(`Le dossier ${dir} n'est pas vide.`)

  const errors: string[] = []
  for (const [rel, b64] of Object.entries(archive.contenu)) {
    const data = Buffer.from(b64, 'base64')
    const expected = rel === 'base.db' ? archive.manifest.base : archive.manifest.fichiers[rel]
    if (sha256(data) !== expected) errors.push(rel)
    const dest = path.join(dir, rel === 'base.db' ? 'base.db' : path.join('uploads', rel))
    mkdirSync(path.dirname(dest), { recursive: true })
    await writeFile(dest, data)
  }

  // La base restaurée est ouverte à part, sans toucher à celle en service.
  const restored = new PrismaClient({ datasources: { db: { url: `file:${path.join(dir, 'base.db')}` } } })
  const journal = []
  try {
    for (const entry of archive.manifest.journal) {
      const chain = await verifyAuditChain(entry.organisationId, restored)
      const last = await restored.auditEvent.findFirst({ where: { organizationId: entry.organisationId }, orderBy: { timestampServer: 'desc' } })
      journal.push({
        organisationId: entry.organisationId,
        chaineIntacte: chain.intact,
        evenements: await restored.auditEvent.count({ where: { organizationId: entry.organisationId } }),
        dernierHashConforme: (last?.eventHash ?? null) === entry.dernierHash,
      })
    }
  } finally {
    await restored.$disconnect()
  }
  if (!targetDir) await rm(dir, { recursive: true, force: true })

  return {
    archiveIntegre: errors.length === 0,
    fichiersControles: Object.keys(archive.contenu).length,
    fichiersEnErreur: errors,
    journal,
    restaureDans: targetDir ? dir : null,
  }
}
