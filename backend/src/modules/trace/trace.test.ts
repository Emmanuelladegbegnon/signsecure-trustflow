import { describe, expect, it } from 'vitest'
import request from 'supertest'
import sharp from 'sharp'
import { createApp } from '../../app.js'
import { prisma } from '../../db.js'
import { getTestOtpProvider } from '../../lib/otpProvider.js'
import { sentTestEmails } from '../../lib/notify.js'
import { createTestOrganization, createTestUser, sessionCookie } from '../../test/factories.js'

const app = createApp()
const CSRF = ['X-Requested-With', 'SignSecure'] as const
const PAGE_PHOTO = await sharp({ create: { width: 60, height: 80, channels: 3, background: '#f4f4f4' } }).jpeg().toBuffer()

async function loginAs(email: string, password: string): Promise<string> {
  await request(app).post('/api/auth/login').send({ email, password }).expect(200)
  const code = getTestOtpProvider().lastCodeFor(email, 'email')
  return sessionCookie(await request(app).post('/api/auth/otp/verify').send({ email, code }).expect(200))
}

async function setup() {
  const org = await createTestOrganization()
  const agent = await createTestUser({ organizationId: org.id, roles: ['AGENT_RECEPTION'] })
  const supervisor = await createTestUser({ organizationId: org.id, roles: ['SUPERVISEUR'] })
  const signer = await createTestUser({ organizationId: org.id, roles: ['SIGNATAIRE'] })
  const agentCookie = await loginAs(agent.email, agent.password)
  const supervisorCookie = await loginAs(supervisor.email, supervisor.password)

  // L'agent enregistre seul un document de 2 pages ; il ne peut pas le valider lui-même.
  const created = await request(app)
    .post('/api/trace/enregistrement')
    .set('Cookie', agentCookie)
    .set(...CSRF)
    .send({ type: 'contrat', titre: 'Bail commercial', dateIndiquee: '2026-10-01', nombrePages: 2 })
    .expect(201)
  const dossierId = created.body.dossierId as string
  await request(app)
    .post(`/api/trace/${dossierId}/capture`)
    .set('Cookie', agentCookie)
    .set(...CSRF)
    .attach('photos', PAGE_PHOTO, { filename: 'p1.jpg', contentType: 'image/jpeg' })
    .attach('photos', PAGE_PHOTO, { filename: 'p2.jpg', contentType: 'image/jpeg' })
    .expect(200)
  return { org, agent, supervisor, signer, agentCookie, supervisorCookie, dossierId }
}

describe('Trace — validation par le superviseur et transfert de garde', () => {
  it("laisse le superviseur valider le dossier enregistré par un agent, jamais l'agent", async () => {
    const { agentCookie, supervisorCookie, dossierId } = await setup()

    await request(app).post(`/api/trace/${dossierId}/valider`).set('Cookie', agentCookie).set(...CSRF).expect(403)

    const listed = await request(app).get('/api/documents').set('Cookie', supervisorCookie).expect(200)
    expect(listed.body.dossiers).toContainEqual(expect.objectContaining({ id: dossierId, origine: 'TRACE', statut: 'DRAFT' }))

    const validated = await request(app).post(`/api/trace/${dossierId}/valider`).set('Cookie', supervisorCookie).set(...CSRF).expect(200)
    expect(validated.body.trackingCode).toMatch(/^TRC-/)
  })

  it('propose les destinataires possibles, puis le destinataire voit et confirme le transfert', async () => {
    const { agent, supervisor, signer, agentCookie, supervisorCookie, dossierId } = await setup()

    const recipients = await request(app).get('/api/trace/destinataires').set('Cookie', agentCookie).expect(200)
    const ids = recipients.body.destinataires.map((d: { id: string }) => d.id)
    expect(ids).toContain(supervisor.user.id)
    expect(ids).not.toContain(agent.user.id) // jamais soi-même
    expect(ids).not.toContain(signer.user.id) // pas d'accès à Trace

    await request(app)
      .post(`/api/trace/${dossierId}/transfert`)
      .set('Cookie', agentCookie)
      .set(...CSRF)
      .send({ destinataireId: signer.user.id })
      .expect(400)

    const transfer = await request(app)
      .post(`/api/trace/${dossierId}/transfert`)
      .set('Cookie', agentCookie)
      .set(...CSRF)
      .send({ destinataireId: supervisor.user.id, lieu: 'Archives, bureau 2' })
      .expect(201)
    const transfertId = transfer.body.transfertId as string
    expect(sentTestEmails.some((m) => m.to === supervisor.email && m.body.includes(`/mobile/transfert/${transfertId}/reception`))).toBe(true)

    // Un second transfert est refusé sans laisser de ligne « à recevoir » orpheline.
    await request(app)
      .post(`/api/trace/${dossierId}/transfert`)
      .set('Cookie', agentCookie)
      .set(...CSRF)
      .send({ destinataireId: supervisor.user.id })
      .expect(409)
    expect(await prisma.transfer.count({ where: { documentId: dossierId } })).toBe(1)

    const incoming = await request(app).get('/api/trace/transferts/a-recevoir').set('Cookie', supervisorCookie).expect(200)
    expect(incoming.body.transferts).toEqual([
      expect.objectContaining({ id: transfertId, lieu: 'Archives, bureau 2', document: expect.objectContaining({ id: dossierId, titre: 'Bail commercial' }) }),
    ])
    const agentIncoming = await request(app).get('/api/trace/transferts/a-recevoir').set('Cookie', agentCookie).expect(200)
    expect(agentIncoming.body.transferts).toEqual([])

    await request(app).post(`/api/trace/transfert/${transfertId}/confirmer`).set('Cookie', supervisorCookie).set(...CSRF).expect(200)
    const after = await request(app).get('/api/trace/transferts/a-recevoir').set('Cookie', supervisorCookie).expect(200)
    expect(after.body.transferts).toEqual([])
    const document = await prisma.document.findUniqueOrThrow({ where: { id: dossierId } })
    expect(document.currentHolderId).toBe(supervisor.user.id)
    expect(document.custodyStatus).toBeNull()
  })

  it("refuse un destinataire d'une autre organisation", async () => {
    const { agentCookie, dossierId } = await setup()
    const otherOrg = await createTestOrganization()
    const outsider = await createTestUser({ organizationId: otherOrg.id, roles: ['SUPERVISEUR'] })

    const res = await request(app)
      .post(`/api/trace/${dossierId}/transfert`)
      .set('Cookie', agentCookie)
      .set(...CSRF)
      .send({ destinataireId: outsider.user.id })
      .expect(400)
    expect(res.body.error.code).toBe('UNKNOWN_DESTINATAIRE')
  })
})
