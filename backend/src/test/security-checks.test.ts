/**
 * Contrôles de sécurité automatiques, lancés à chaque `npm test` : en-têtes
 * HTTP, CORS, accès sans session, anti-CSRF, cloisonnement entre
 * organisations, reconfirmation des actions sensibles, règle de mot de passe,
 * alertes, sauvegarde/restauration et changement de clé de chiffrement.
 * Complète le scan OWASP ZAP (`npm run security:zap`), qui teste l'application
 * lancée de l'extérieur.
 */
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { createApp } from '../app.js'
import { prisma } from '../db.js'
import { env } from '../env.js'
import { getTestOtpProvider } from '../lib/otpProvider.js'
import { sentTestEmails } from '../lib/notify.js'
import { passwordProblem } from '../lib/passwordPolicy.js'
import { createBackup, verifyBackup } from '../lib/backup.js'
import { decryptBuffer, encryptBuffer, keyIdOf, resetKeyRing } from '../lib/fileCrypto.js'
import { createTestOrganization, createTestUser, sessionCookie } from './factories.js'

const app = createApp()
const CSRF = ['X-Requested-With', 'SignSecure'] as const

async function loginAs(email: string, password: string): Promise<string> {
  await request(app).post('/api/auth/login').send({ email, password }).expect(200)
  const code = getTestOtpProvider().lastCodeFor(email, 'email')
  return sessionCookie(await request(app).post('/api/auth/otp/verify').send({ email, code }).expect(200))
}

describe('En-têtes et exposition', () => {
  it('pose les en-têtes de sécurité et ne révèle pas la technologie du serveur', async () => {
    const res = await request(app).get('/api/health').expect(200)
    expect(res.headers['x-powered-by']).toBeUndefined()
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBeDefined()
    expect(res.headers['content-security-policy']).toContain("default-src 'self'")
    expect(res.headers['strict-transport-security']).toBeDefined()
  })

  it('refuse le CORS à une origine inconnue', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://site-pirate.example')
    expect(res.headers['access-control-allow-origin']).not.toBe('https://site-pirate.example')
  })

  it('annonce la limite de débit sur la vérification publique', async () => {
    const res = await request(app).get('/api/verify/SGN-AAAAAAAA')
    expect(res.headers['ratelimit-limit']).toBeDefined()
  })
})

describe('Sessions et CSRF', () => {
  it('refuse toute route interne sans cookie de session', async () => {
    for (const path of ['/api/auth/me', '/api/documents', '/api/admin/users', '/api/admin/audit', '/api/admin/audit/integrite']) {
      const res = await request(app).get(path)
      expect(res.status, path).toBe(401)
    }
  })

  it('refuse une requête qui modifie des données sans l’en-tête anti-CSRF', async () => {
    const org = await createTestOrganization()
    const u = await createTestUser({ organizationId: org.id, roles: ['AGENT_RECEPTION'] })
    const cookie = await loginAs(u.email, u.password)
    const res = await request(app).post('/api/trace/enregistrement').set('Cookie', cookie).send({ type: 'contrat', titre: 'x', dateIndiquee: '2026-09-30' })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('CSRF_HEADER_MISSING')
  })
})

describe('Cloisonnement entre organisations', () => {
  it('ne donne jamais accès au dossier d’une autre organisation, même avec son identifiant', async () => {
    const orgA = await createTestOrganization()
    const orgB = await createTestOrganization()
    const a = await createTestUser({ organizationId: orgA.id, roles: ['AGENT_RECEPTION', 'SUPERVISEUR', 'VERIFICATEUR'] })
    const b = await createTestUser({ organizationId: orgB.id, roles: ['AGENT_RECEPTION', 'SUPERVISEUR', 'VERIFICATEUR'] })
    const cookieA = await loginAs(a.email, a.password)
    const cookieB = await loginAs(b.email, b.password)

    const created = await request(app)
      .post('/api/trace/enregistrement')
      .set('Cookie', cookieA)
      .set(...CSRF)
      .send({ type: 'contrat', titre: 'Dossier A', dateIndiquee: '2026-09-30' })
      .expect(201)
    const id = created.body.dossierId as string

    for (const path of [`/api/trace/${id}/timeline`, `/api/trace/${id}/photos`, `/api/trace/${id}/comparaisons`, `/api/documents/${id}/fichier`]) {
      const res = await request(app).get(path).set('Cookie', cookieB)
      expect(res.status, path).toBe(404)
    }
    const list = await request(app).get('/api/documents').set('Cookie', cookieB).expect(200)
    expect(list.body.dossiers.map((d: { id: string }) => d.id)).not.toContain(id)
  })
})

describe('Reconfirmation avant action sensible', () => {
  it('exige un nouveau code pour gérer un compte, puis laisse passer pendant 5 minutes', async () => {
    const org = await createTestOrganization()
    const admin = await createTestUser({ organizationId: org.id, roles: ['ADMINISTRATEUR'] })
    const target = await createTestUser({ organizationId: org.id, roles: ['SIGNATAIRE'] })
    const cookie = await loginAs(admin.email, admin.password)

    const refused = await request(app).patch(`/api/admin/users/${target.user.id}/statut`).set('Cookie', cookie).set(...CSRF).send({ statut: 'suspendu' })
    expect(refused.status).toBe(403)
    expect(refused.body.error.code).toBe('REAUTH_REQUIRED')

    await request(app).post('/api/auth/reconfirmation').set('Cookie', cookie).set(...CSRF).expect(200)
    const code = getTestOtpProvider().lastCodeFor(admin.email, 'email')
    await request(app).post('/api/auth/reconfirmation/verifier').set('Cookie', cookie).set(...CSRF).send({ code }).expect(200)

    const allowed = await request(app).patch(`/api/admin/users/${target.user.id}/statut`).set('Cookie', cookie).set(...CSRF).send({ statut: 'suspendu' })
    expect(allowed.status).toBe(200)

    // Alerte envoyée aux administrateurs de l'organisation (en arrière-plan).
    await new Promise((r) => setTimeout(r, 200))
    expect(sentTestEmails.some((m) => m.to === admin.email && m.subject.includes('Compte suspendu'))).toBe(true)
  })
})

describe('Mots de passe', () => {
  it('refuse les mots de passe courts, courants ou tirés du nom', () => {
    expect(passwordProblem('court1!')).toMatch(/12 caractères/)
    expect(passwordProblem('azerty123456')).toMatch(/plus utilisés/)
    expect(passwordProblem('motdepasse2026!')).toMatch(/plus utilisés/)
    expect(passwordProblem('AminataKone1990', { prenom: 'Aminata', nom: 'Koné' })).toMatch(/nom/)
    expect(passwordProblem('le manguier derrière la case')).toBeNull()
  })

  it('applique la règle à l’activation d’un compte invité', async () => {
    const org = await createTestOrganization()
    const user = await prisma.user.create({
      data: { organizationId: org.id, nom: 'Test', prenom: 'Invite', email: `invite-${randomUUID()}@test.local`, telephone: '+229 01 00 00 00 01', statut: 'INVITE' },
    })
    const token = randomUUID()
    await prisma.invitationToken.create({ data: { token, userId: user.id, expiresAt: new Date(Date.now() + 86_400_000) } })

    const weak = await request(app).post(`/api/auth/invitation/${token}/activer`).send({ password: 'password1234' })
    expect(weak.status).toBe(400)
    expect(weak.body.error.code).toBe('WEAK_PASSWORD')
    await request(app).post(`/api/auth/invitation/${token}/activer`).send({ password: 'trois cailloux sur la route' }).expect(200)
  })
})

describe('Alertes de sécurité', () => {
  it('prévient les administrateurs quand un compte est bloqué', async () => {
    const org = await createTestOrganization()
    const admin = await createTestUser({ organizationId: org.id, roles: ['ADMINISTRATEUR'] })
    const victim = await createTestUser({ organizationId: org.id, roles: ['SIGNATAIRE'] })
    for (let i = 0; i < env.accountLockThreshold; i++) {
      await request(app).post('/api/auth/login').send({ email: victim.email, password: 'mauvais-mot-de-passe' })
    }
    await new Promise((r) => setTimeout(r, 200)) // l'alerte part sans bloquer la réponse
    expect(sentTestEmails.some((m) => m.to === admin.email && m.subject.includes('Compte bloqué'))).toBe(true)
  })
})

describe('Sauvegarde et restauration', () => {
  it('produit une archive chiffrée dont la restauration est vérifiée, et détecte une archive modifiée', async () => {
    const org = await createTestOrganization()
    await createTestUser({ organizationId: org.id, roles: ['ADMINISTRATEUR'] })
    const backup = await createBackup()

    const archive = await readFile(backup.fichier)
    expect(archive.toString('latin1')).not.toContain('SQLite format') // la base n'apparaît pas en clair

    const check = await verifyBackup(backup.fichier)
    expect(check.archiveIntegre).toBe(true)
    // (le journal d'autres organisations de la base de test est volontairement altéré par audit.test.ts)
    const ours = check.journal.find((j) => j.organisationId === org.id)
    expect(ours).toMatchObject({ chaineIntacte: true, dernierHashConforme: true })

    archive[archive.length - 5] ^= 0xff
    const tampered = `${backup.fichier}.altere`
    await writeFile(tampered, archive)
    await expect(verifyBackup(tampered)).rejects.toThrow()
  })
})

describe('Changement de clé de chiffrement', () => {
  it('relit un fichier chiffré avec l’ancienne clé et chiffre les nouveaux avec la nouvelle', () => {
    const original = { keys: env.fileEncryptionKeys, key: env.fileEncryptionKey }
    try {
      const old = encryptBuffer(Buffer.from('contrat'))
      expect(keyIdOf(old)).toBe('v1')

      Object.assign(env, { fileEncryptionKeys: `v2:${'1a'.repeat(32)},v1:${'0f'.repeat(32)}` })
      resetKeyRing()
      expect(decryptBuffer(old).toString()).toBe('contrat')
      expect(keyIdOf(encryptBuffer(Buffer.from('nouveau')))).toBe('v2')
    } finally {
      Object.assign(env, { fileEncryptionKeys: original.keys, fileEncryptionKey: original.key })
      resetKeyRing()
    }
  })
})
