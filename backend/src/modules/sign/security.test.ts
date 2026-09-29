import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { readFile } from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'
import { createApp } from '../../app.js'
import { prisma } from '../../db.js'
import { verifyAuditChain } from '../../lib/audit.js'
import { getTestOtpProvider } from '../../lib/otpProvider.js'
import { readStoredFile, sha256Hex } from '../../lib/storage.js'
import { createTestOrganization, createTestUser } from '../../test/factories.js'

const app = createApp()
// PNG 1×1 — tient lieu de signature dessinée.
const SIGNATURE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
const JPEG_BYTES = Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex')

async function makePdf(pages = 2): Promise<Buffer> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([595, 842])
  return Buffer.from(await doc.save())
}

async function loginAs(email: string, password: string): Promise<string> {
  await request(app).post('/api/auth/login').send({ email, password }).expect(200)
  const code = getTestOtpProvider().lastCodeFor(email, 'email')
  const res = await request(app).post('/api/auth/otp/verify').send({ email, code }).expect(200)
  return res.body.token as string
}

let phoneCounter = 0
function uniquePhone(): string {
  phoneCounter += 1
  return `+229 01 ${String(Date.now()).slice(-6)} ${String(phoneCounter).padStart(2, '0')}`
}

async function setupIssuer(roles: Parameters<typeof createTestUser>[0]['roles'] = ['SIGNATAIRE']) {
  const org = await createTestOrganization()
  const issuer = await createTestUser({ organizationId: org.id, roles })
  const token = await loginAs(issuer.email, issuer.password)
  return { org, issuer, token }
}

async function createSignDocument(token: string, opts: { sensible?: boolean } = {}) {
  const res = await request(app)
    .post('/api/documents')
    .set('Authorization', `Bearer ${token}`)
    .field('titre', 'Contrat de test')
    .field('type', 'contrat')
    .field('sensible', String(opts.sensible ?? false))
    .attach('fichier', await makePdf(), { filename: 'contrat.pdf', contentType: 'application/pdf' })
    .expect(201)
  return res.body.dossierId as string
}

async function assignAndSend(token: string, dossierId: string, signer: { email: string; telephone: string }) {
  await request(app)
    .post(`/api/documents/${dossierId}/signataires`)
    .set('Authorization', `Bearer ${token}`)
    .send({ signataires: [{ nom: 'Awa Signataire', ...signer, zone: { page: 1, x: 10, y: 10 } }] })
    .expect(200)
  await request(app).post(`/api/documents/${dossierId}/envoyer`).set('Authorization', `Bearer ${token}`).expect(200)
  const signatory = await prisma.signatory.findFirstOrThrow({ where: { documentId: dossierId } })
  return signatory
}

describe('Sign — parcours sécurisé', () => {
  it("refuse un signataire qui utilise l'email ou le numéro de l'émetteur", async () => {
    const { issuer, token } = await setupIssuer()
    const dossierId = await createSignDocument(token)

    const res = await request(app)
      .post(`/api/documents/${dossierId}/signataires`)
      .set('Authorization', `Bearer ${token}`)
      .send({ signataires: [{ nom: 'Moi', email: issuer.email.toUpperCase(), telephone: uniquePhone(), zone: { page: 1, x: 10, y: 10 } }] })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('SIGNER_IS_ISSUER')

    const samePhone = await request(app)
      .post(`/api/documents/${dossierId}/signataires`)
      .set('Authorization', `Bearer ${token}`)
      .send({ signataires: [{ nom: 'Complice', email: 'autre@test.local', telephone: issuer.user.telephone, zone: { page: 1, x: 10, y: 10 } }] })
    expect(samePhone.body.error.code).toBe('SIGNER_IS_ISSUER')
  })

  it('envoie le code de signature par SMS, puis produit une version finale scellée dont le hash est vérifiable', async () => {
    const { org, token } = await setupIssuer()
    const dossierId = await createSignDocument(token)
    const telephone = uniquePhone()
    const signatory = await assignAndSend(token, dossierId, { email: `signataire-${Date.now()}@test.local`, telephone })

    // Stockage chiffré : le PDF déposé n'est pas lisible en clair sur disque.
    const draft = await prisma.document.findUniqueOrThrow({ where: { id: dossierId } })
    expect((await readFile(draft.fichierPath!)).subarray(0, 4).toString()).not.toBe('%PDF')
    expect(draft.originalHashSha256).toMatch(/^[0-9a-f]{64}$/)

    const info = await request(app).get(`/api/sign/link/${signatory.linkToken}`).expect(200)
    expect(info.body.otp.canaux.map((c: { canal: string }) => c.canal)).toEqual(['sms'])

    await request(app)
      .post(`/api/sign/link/${signatory.linkToken}/signature`)
      .set('User-Agent', 'TestBrowser/1.0')
      .send({ signatureImageBase64: SIGNATURE_PNG, consentement: true })
      .expect(200)

    const provider = getTestOtpProvider()
    const smsCode = provider.lastCodeFor(signatory.telephone, 'sms')
    expect(smsCode).toBeDefined()
    // Jamais par email pour un document non sensible : la boîte mail du lien ne suffit pas.
    expect(provider.lastCodeFor(signatory.email, 'email')).toBeUndefined()

    const wrong = await request(app).post(`/api/sign/link/${signatory.linkToken}/otp/verify`).send({ code: smsCode === '000000' ? '111111' : '000000' })
    expect(wrong.status).toBe(401)

    await request(app)
      .post(`/api/sign/link/${signatory.linkToken}/otp/verify`)
      .set('User-Agent', 'TestBrowser/1.0')
      .send({ code: smsCode })
      .expect(200)

    const signed = await prisma.document.findUniqueOrThrow({ where: { id: dossierId }, include: { signataires: true } })
    expect(signed.statut).toBe('SIGNED')
    expect(signed.sealedAt).not.toBeNull()
    expect(signed.signataires[0]!.userAgent).toBe('TestBrowser/1.0')
    expect(signed.signataires[0]!.otpChannels).toBe('sms')

    const finalBytes = await readStoredFile(signed.finalPdfPath!)
    expect(sha256Hex(finalBytes)).toBe(signed.hashSha256)
    const asText = finalBytes.toString('latin1')
    expect(asText).toContain('/ByteRange')
    expect(asText).toContain('adbe.pkcs7.detached')

    // Verify : hash exact sur la version finale, divergence au moindre octet modifié.
    const ok = await request(app)
      .post(`/api/verify/${signed.trackingCode}/comparer`)
      .attach('fichier', finalBytes, { filename: 'final.pdf', contentType: 'application/pdf' })
      .expect(200)
    expect(ok.body.resultat).toBe('correspond')

    const tampered = Buffer.from(finalBytes)
    tampered[tampered.length - 10] = tampered[tampered.length - 10]! ^ 0xff
    const ko = await request(app)
      .post(`/api/verify/${signed.trackingCode}/comparer`)
      .attach('fichier', tampered, { filename: 'final.pdf', contentType: 'application/pdf' })
      .expect(200)
    expect(ko.body.resultat).toBe('diverge')

    const report = await request(app).get(`/api/documents/${dossierId}/rapport-preuve`).set('Authorization', `Bearer ${token}`).expect(200)
    expect(report.body.signataires[0].identite).toMatch(/non vérifiée/)
    expect(report.body.signataires[0].dates.consentement).toBeTruthy()
    expect(report.body.empreinte.cachet).not.toBeNull()
    expect(report.body.journal.chaineIntacte).toBe(true)

    expect((await verifyAuditChain(org.id)).intact).toBe(true)
  })

  it('exige deux codes (SMS + email) pour un document sensible', async () => {
    const { token } = await setupIssuer()
    const dossierId = await createSignDocument(token, { sensible: true })
    const signatory = await assignAndSend(token, dossierId, { email: `sensible-${Date.now()}@test.local`, telephone: uniquePhone() })

    await request(app)
      .post(`/api/sign/link/${signatory.linkToken}/signature`)
      .send({ signatureImageBase64: SIGNATURE_PNG, consentement: true })
      .expect(200)
    const provider = getTestOtpProvider()
    const smsCode = provider.lastCodeFor(signatory.telephone, 'sms')
    const emailCode = provider.lastCodeFor(signatory.email, 'email')
    expect(smsCode).toBeDefined()
    expect(emailCode).toBeDefined()

    const onlySms = await request(app).post(`/api/sign/link/${signatory.linkToken}/otp/verify`).send({ code: smsCode })
    expect(onlySms.status).toBe(401)

    await request(app).post(`/api/sign/link/${signatory.linkToken}/otp/verify`).send({ code: smsCode, codeEmail: emailCode }).expect(200)
    const signed = await prisma.signatory.findUniqueOrThrow({ where: { id: signatory.id } })
    expect(signed.otpChannels).toBe('sms+email')
  })
})

describe('Sessions — expiration sur inactivité', () => {
  it("refuse une session inactive depuis plus que le délai et invalide le token à la déconnexion", async () => {
    const { token } = await setupIssuer()
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200)

    const { sid } = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString()) as { sid: string }
    await prisma.session.update({ where: { id: sid }, data: { lastActivityAt: new Date(Date.now() - 60 * 60_000) } })
    const idle = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
    expect(idle.status).toBe(401)
    expect(idle.body.error.code).toBe('SESSION_IDLE_TIMEOUT')

    const { token: fresh } = await setupIssuer()
    await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${fresh}`).expect(200)
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${fresh}`).expect(401)
  })
})

describe('Trace — preuve à la réception', () => {
  it('inscrit au journal l’empreinte serveur de chaque photo et exige une photo par page déclarée', async () => {
    const { token } = await setupIssuer(['AGENT_RECEPTION', 'SUPERVISEUR', 'VERIFICATEUR'])
    const reg = await request(app)
      .post('/api/trace/enregistrement')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'contrat', titre: 'Contrat papier', dateIndiquee: '2026-09-29', nombrePages: 2 })
      .expect(201)
    const id = reg.body.dossierId as string

    const capture = await request(app)
      .post(`/api/trace/${id}/capture`)
      .set('Authorization', `Bearer ${token}`)
      .attach('photos', JPEG_BYTES, { filename: 'page1.jpg', contentType: 'image/jpeg' })
      .expect(200)
    expect(capture.body.empreintes[0].sha256).toBe(sha256Hex(JPEG_BYTES))

    const event = await prisma.auditEvent.findFirstOrThrow({ where: { documentId: id, action: 'TRACE_PHOTO_CAPTURED' } })
    expect(JSON.parse(event.details!).sha256).toBe(sha256Hex(JPEG_BYTES))

    const early = await request(app).post(`/api/trace/${id}/valider`).set('Authorization', `Bearer ${token}`)
    expect(early.status).toBe(400)
    expect(early.body.error.code).toBe('PAGES_MISSING_PHOTOS')

    await request(app)
      .post(`/api/trace/${id}/capture`)
      .set('Authorization', `Bearer ${token}`)
      .attach('photos', JPEG_BYTES, { filename: 'page2.jpg', contentType: 'image/jpeg' })
      .expect(200)
    const validated = await request(app).post(`/api/trace/${id}/valider`).set('Authorization', `Bearer ${token}`).expect(200)

    // Verify public : aucune comparaison automatique, aucun score ni verdict.
    const compare = await request(app)
      .post(`/api/verify/${validated.body.trackingCode}/comparer`)
      .attach('fichier', JPEG_BYTES, { filename: 'copie.jpg', contentType: 'image/jpeg' })
      .expect(200)
    expect(compare.body.methode).toBe('examen_humain')
    expect(compare.body.resultat).toBeUndefined()
    expect(compare.body.score).toBeUndefined()

    // Examen de concordance humain, journalisé.
    const review = await request(app)
      .post(`/api/trace/${id}/comparaisons`)
      .set('Authorization', `Bearer ${token}`)
      .field('conclusion', 'CONCORDANCE_CONSTATEE')
      .field('commentaire', 'Pages 1 et 2 comparées visuellement aux photos de réception.')
      .attach('fichier', JPEG_BYTES, { filename: 'copie.jpg', contentType: 'image/jpeg' })
      .expect(201)
    expect(review.body.conclusion).toBe('CONCORDANCE_CONSTATEE')
    const list = await request(app).get(`/api/trace/${id}/comparaisons`).set('Authorization', `Bearer ${token}`).expect(200)
    expect(list.body.comparaisons).toHaveLength(1)
  })
})
