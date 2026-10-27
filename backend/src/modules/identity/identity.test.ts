import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { existsSync } from 'node:fs'
import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'
import { createApp } from '../../app.js'
import { prisma } from '../../db.js'
import { getTestOtpProvider } from '../../lib/otpProvider.js'
import { sentTestEmails } from '../../lib/notify.js'
import { createTestOrganization, createTestUser, sessionCookie } from '../../test/factories.js'

const app = createApp()
const CSRF = ['X-Requested-With', 'SignSecure'] as const
const SIGNATURE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
const ID_PHOTO = await sharp({ create: { width: 60, height: 40, channels: 3, background: '#88aacc' } })
  .jpeg()
  .withExif({ IFD0: { Make: 'TelephoneTest' } })
  .toBuffer()

async function loginAs(email: string, password: string): Promise<string> {
  await request(app).post('/api/auth/login').send({ email, password }).expect(200)
  const code = getTestOtpProvider().lastCodeFor(email, 'email')
  return sessionCookie(await request(app).post('/api/auth/otp/verify').send({ email, code }).expect(200))
}

async function reauth(cookie: string, email: string) {
  await request(app).post('/api/auth/reconfirmation').set('Cookie', cookie).set(...CSRF).expect(200)
  const code = getTestOtpProvider().lastCodeFor(email, 'email')
  await request(app).post('/api/auth/reconfirmation/verifier').set('Cookie', cookie).set(...CSRF).send({ code }).expect(200)
}

async function setup() {
  const org = await createTestOrganization()
  // L'émetteur est aussi vérificateur : il ne doit pas pouvoir contrôler ses propres signataires.
  const issuer = await createTestUser({ organizationId: org.id, roles: ['SIGNATAIRE', 'VERIFICATEUR'] })
  const reviewer = await createTestUser({ organizationId: org.id, roles: ['VERIFICATEUR'] })
  const issuerCookie = await loginAs(issuer.email, issuer.password)
  const reviewerCookie = await loginAs(reviewer.email, reviewer.password)

  const pdf = await PDFDocument.create()
  pdf.addPage()
  const created = await request(app)
    .post('/api/documents')
    .set('Cookie', issuerCookie)
    .set(...CSRF)
    .field('titre', 'Acte de cession')
    .field('type', 'contrat')
    .field('controleIdentite', 'true')
    .attach('fichier', Buffer.from(await pdf.save()), { filename: 'acte.pdf', contentType: 'application/pdf' })
    .expect(201)
  const dossierId = created.body.dossierId as string
  const email = `cedant-${Date.now()}@test.local`
  await request(app)
    .post(`/api/documents/${dossierId}/signataires`)
    .set('Cookie', issuerCookie)
    .set(...CSRF)
    .send({ signataires: [{ nom: 'Afi Mensah', email, telephone: `+229 01 ${String(Date.now()).slice(-8)}`, zone: { page: 1, x: 50, y: 70 } }] })
    .expect(200)
  await request(app).post(`/api/documents/${dossierId}/envoyer`).set('Cookie', issuerCookie).set(...CSRF).expect(200)
  const signatory = await prisma.signatory.findFirstOrThrow({ where: { documentId: dossierId } })
  return { issuer, reviewer, issuerCookie, reviewerCookie, dossierId, signatory, token: signatory.linkToken! }
}

describe("Contrôle de pièce d'identité (sans biométrie)", () => {
  it('bloque la signature jusqu’à validation par un autre vérificateur, puis supprime la photo', async () => {
    const { issuer, reviewer, issuerCookie, reviewerCookie, dossierId, signatory, token } = await setup()

    const info = await request(app).get(`/api/sign/link/${token}`).expect(200)
    expect(info.body.identite).toMatchObject({ requise: true, statut: 'A_FOURNIR' })

    const tooEarly = await request(app).post(`/api/sign/link/${token}/signature`).send({ signatureImageBase64: SIGNATURE_PNG, consentement: true })
    expect(tooEarly.status).toBe(403)
    expect(tooEarly.body.error.code).toBe('IDENTITY_CHECK_PENDING')

    await request(app)
      .post(`/api/sign/link/${token}/identite`)
      .field('typePiece', 'CNI')
      .attach('recto', ID_PHOTO, { filename: 'recto.jpg', contentType: 'image/jpeg' })
      .expect(200)
    const pending = await prisma.signatory.findUniqueOrThrow({ where: { id: signatory.id } })
    expect(pending.identityStatus).toBe('EN_ATTENTE')
    expect(existsSync(pending.identityFrontPath!)).toBe(true)
    expect(sentTestEmails.some((m) => m.to === reviewer.email && m.subject.includes("pièce d'identité"))).toBe(true)

    // L'émetteur du dossier ne peut pas contrôler ses propres signataires.
    await reauth(issuerCookie, issuer.email)
    const self = await request(app).post(`/api/identites/${signatory.id}/decision`).set('Cookie', issuerCookie).set(...CSRF).send({ decision: 'VALIDEE', nomConforme: true })
    expect(self.body.error.code).toBe('SAME_PERSON')

    // Un autre vérificateur : liste, consultation (journalisée), puis décision après reconfirmation.
    const list = await request(app).get('/api/identites').set('Cookie', reviewerCookie).expect(200)
    expect(list.body.controles.map((c: { signataireId: string }) => c.signataireId)).toContain(signatory.id)
    await request(app).get(`/api/identites/${signatory.id}/piece/recto`).set('Cookie', reviewerCookie).expect(200)
    const noReauth = await request(app).post(`/api/identites/${signatory.id}/decision`).set('Cookie', reviewerCookie).set(...CSRF).send({ decision: 'VALIDEE', nomConforme: true })
    expect(noReauth.body.error.code).toBe('REAUTH_REQUIRED')
    await reauth(reviewerCookie, reviewer.email)
    await request(app).post(`/api/identites/${signatory.id}/decision`).set('Cookie', reviewerCookie).set(...CSRF).send({ decision: 'VALIDEE', nomConforme: true }).expect(200)

    const checked = await prisma.signatory.findUniqueOrThrow({ where: { id: signatory.id } })
    expect(checked.identityStatus).toBe('VALIDEE')
    expect(checked.identityFrontPath).toBeNull()
    expect(existsSync(pending.identityFrontPath!)).toBe(false) // photo supprimée
    expect(checked.identityFrontSha256).toMatch(/^[0-9a-f]{64}$/) // seule l'empreinte reste
    const event = await prisma.auditEvent.findFirstOrThrow({ where: { documentId: dossierId, action: 'IDENTITY_CHECKED' } })
    expect(JSON.parse(event.details!)).toMatchObject({ decision: 'VALIDEE', photosSupprimees: true })

    // La signature est maintenant possible.
    await request(app).post(`/api/sign/link/${token}/signature`).send({ signatureImageBase64: SIGNATURE_PNG, consentement: true }).expect(200)
    const sms = getTestOtpProvider().lastCodeFor(checked.telephone, 'sms')
    await request(app).post(`/api/sign/link/${token}/otp/verify`).send({ code: sms }).expect(200)

    const report = await request(app).get(`/api/documents/${dossierId}/rapport-preuve`).set('Cookie', issuerCookie).expect(200)
    expect(report.body.signataires[0].identite).toMatch(/contrôlée visuellement/)
    expect(report.body.signataires[0].controleIdentite.typePiece).toBe("carte nationale d'identité")
  })

  it('refuse une pièce avec un motif, supprime la photo et permet un nouvel envoi', async () => {
    const { reviewer, reviewerCookie, signatory, token } = await setup()
    await request(app).post(`/api/sign/link/${token}/identite`).field('typePiece', 'PASSEPORT').attach('recto', ID_PHOTO, { filename: 'p.jpg', contentType: 'image/jpeg' }).expect(200)
    await reauth(reviewerCookie, reviewer.email)

    const noMotif = await request(app).post(`/api/identites/${signatory.id}/decision`).set('Cookie', reviewerCookie).set(...CSRF).send({ decision: 'REFUSEE', nomConforme: false })
    expect(noMotif.body.error.code).toBe('MOTIF_REQUIRED')
    await request(app)
      .post(`/api/identites/${signatory.id}/decision`)
      .set('Cookie', reviewerCookie)
      .set(...CSRF)
      .send({ decision: 'REFUSEE', nomConforme: false, motif: 'Photo floue, nom illisible.' })
      .expect(200)

    const info = await request(app).get(`/api/sign/link/${token}`).expect(200)
    expect(info.body.identite).toMatchObject({ statut: 'REFUSEE', motifRefus: 'Photo floue, nom illisible.' })
    await request(app).post(`/api/sign/link/${token}/identite`).field('typePiece', 'PASSEPORT').attach('recto', ID_PHOTO, { filename: 'p2.jpg', contentType: 'image/jpeg' }).expect(200)
  })
})
