import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { PDFDocument } from 'pdf-lib'
import { createApp } from '../../app.js'
import { prisma } from '../../db.js'
import { getTestOtpProvider } from '../../lib/otpProvider.js'
import { pageToken } from '../../lib/pageToken.js'
import { readStoredFile } from '../../lib/storage.js'
import { checkCharacter, generateTrackingCode, inspectTrackingCode } from '../../lib/trackingCode.js'
import { createTestOrganization, createTestUser , sessionCookie } from '../../test/factories.js'

const app = createApp()
const SIGNATURE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

async function loginAs(email: string, password: string): Promise<string> {
  await request(app).post('/api/auth/login').send({ email, password }).expect(200)
  const code = getTestOtpProvider().lastCodeFor(email, 'email')
  return sessionCookie(await request(app).post('/api/auth/otp/verify').send({ email, code }).expect(200))
}

/** Parcours complet : PDF de 3 pages signé par un signataire externe. */
async function signedThreePageDocument() {
  const org = await createTestOrganization()
  const issuer = await createTestUser({ organizationId: org.id, roles: ['SIGNATAIRE', 'ADMINISTRATEUR'] })
  const token = await loginAs(issuer.email, issuer.password)

  const pdf = await PDFDocument.create()
  for (let i = 0; i < 3; i++) pdf.addPage([595, 842])
  const created = await request(app)
    .post('/api/documents')
    .set('Cookie', token).set('X-Requested-With', 'SignSecure')
    .field('titre', 'Bail commercial')
    .field('type', 'contrat')
    .attach('fichier', Buffer.from(await pdf.save()), { filename: 'bail.pdf', contentType: 'application/pdf' })
    .expect(201)
  const dossierId = created.body.dossierId as string
  const email = `bailleur-${Date.now()}@test.local`
  const telephone = `+229 01 ${String(Date.now()).slice(-8)}`
  await request(app)
    .post(`/api/documents/${dossierId}/signataires`)
    .set('Cookie', token).set('X-Requested-With', 'SignSecure')
    .send({ signataires: [{ nom: 'Kossi Bailleur', email, telephone, zone: { page: 3, x: 60, y: 70 } }] })
    .expect(200)
  await request(app).post(`/api/documents/${dossierId}/envoyer`).set('Cookie', token).set('X-Requested-With', 'SignSecure').expect(200)
  const signatory = await prisma.signatory.findFirstOrThrow({ where: { documentId: dossierId } })
  await request(app).post(`/api/sign/link/${signatory.linkToken}/signature`).send({ signatureImageBase64: SIGNATURE_PNG, consentement: true }).expect(200)
  const sms = getTestOtpProvider().lastCodeFor(signatory.telephone, 'sms')
  await request(app).post(`/api/sign/link/${signatory.linkToken}/otp/verify`).send({ code: sms }).expect(200)
  const document = await prisma.document.findUniqueOrThrow({ where: { id: dossierId } })
  return { org, token, document }
}

describe('Code de suivi — caractère de contrôle', () => {
  it('détecte une faute de frappe ou un code retouché', async () => {
    const code = generateTrackingCode('SGN')
    expect(inspectTrackingCode(code)).toBe('valid')
    const [prefix, body] = code.split('-') as [string, string]
    const altered = `${prefix}-${body.slice(0, 7)}${body[7] === 'A' ? 'B' : 'A'}-${code.slice(-1)}`
    expect(checkCharacter(prefix + altered.split('-')[1])).not.toBe(code.slice(-1))
    expect(inspectTrackingCode(altered)).toBe('bad_check')

    const res = await request(app).get(`/api/verify/${altered}`).expect(200)
    expect(res.body).toEqual({ statut: 'UNKNOWN_CODE', controle: 'CARACTERE_DE_CONTROLE_INVALIDE' })
  })
})

describe('Document de plusieurs pages', () => {
  it('ouvre l’aperçu scellé de chaque page par son jeton, et refuse un jeton recopié sur une autre page', async () => {
    const { document } = await signedThreePageDocument()
    const code = document.trackingCode!

    // Paraphe : la signature apparaît sur les 3 pages (une image par page).
    const final = await PDFDocument.load(await readStoredFile(document.finalPdfPath!))
    expect(final.getPageCount()).toBe(3)

    const page2 = await request(app).get(`/api/verify/${code}/pages/2?k=${pageToken(code, 2)}`).expect(200)
    expect(page2.headers['content-type']).toContain('application/pdf')
    expect(page2.headers['x-nombre-pages']).toBe('3')
    expect((await PDFDocument.load(page2.body as Buffer)).getPageCount()).toBe(1)

    // Le jeton de la page 1 recopié sur la page 2 ne vaut rien.
    const reused = await request(app).get(`/api/verify/${code}/pages/2?k=${pageToken(code, 1)}`)
    expect(reused.status).toBe(400)
    expect(reused.body.error.code).toBe('INVALID_PAGE_LINK')
  })
})

describe('Retrouver un document sans code', () => {
  it('retrouve le code à partir du fichier exact, et par recherche interne', async () => {
    const { token, document } = await signedThreePageDocument()
    const finalBytes = await readStoredFile(document.finalPdfPath!)

    const found = await request(app)
      .post('/api/verify/recherche-par-fichier')
      .attach('fichier', finalBytes, { filename: 'bail.pdf', contentType: 'application/pdf' })
      .expect(200)
    expect(found.body).toMatchObject({ trouve: true, trackingCode: document.trackingCode })

    const other = await request(app)
      .post('/api/verify/recherche-par-fichier')
      .attach('fichier', Buffer.from('%PDF-1.4 autre'), { filename: 'x.pdf', contentType: 'application/pdf' })
      .expect(200)
    expect(other.body.trouve).toBe(false)

    const search = await request(app).get('/api/documents?q=Kossi').set('Cookie', token).set('X-Requested-With', 'SignSecure').expect(200)
    expect(search.body.dossiers.map((d: { id: string }) => d.id)).toContain(document.id)
  })
})

describe('Serveur compromis — contrôles hors système', () => {
  it('publie l’empreinte du certificat de cachet et la rattache à chaque document scellé', async () => {
    const { token, document } = await signedThreePageDocument()
    const cert = await request(app).get('/api/verify/cachet/certificat').expect(200)
    expect(cert.body.empreinteSha256).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/)
    expect(document.sealCertFingerprint).toBe(cert.body.empreinteSha256)

    const report = await request(app).get(`/api/documents/${document.id}/rapport-preuve`).set('Cookie', token).set('X-Requested-With', 'SignSecure').expect(200)
    expect(report.body.empreinte.cachet.conformeAuCertificatPublie).toBe(true)
  })

  it('confirme un hash d’ancrage présent et signale un hash disparu', async () => {
    const { org, token } = await signedThreePageDocument()
    const last = await prisma.auditEvent.findFirstOrThrow({ where: { organizationId: org.id }, orderBy: { timestampServer: 'desc' } })

    const ok = await request(app).post('/api/admin/audit/controle-ancrage').set('Cookie', token).set('X-Requested-With', 'SignSecure').send({ hash: last.eventHash }).expect(200)
    expect(ok.body).toMatchObject({ trouve: true, chaineIntacteJusquIci: true })

    const gone = await request(app).post('/api/admin/audit/controle-ancrage').set('Cookie', token).set('X-Requested-With', 'SignSecure').send({ hash: 'ab'.repeat(32) }).expect(200)
    expect(gone.body.trouve).toBe(false)
  })
})

describe('Marques invisibles', () => {
  it('reconnaît une copie modifiée du document et la retrouve sans code', async () => {
    const { document } = await signedThreePageDocument()
    const original = await readStoredFile(document.finalPdfPath!)

    // Quelqu'un ouvre le PDF signé, change un montant, et réenregistre.
    const edited = await PDFDocument.load(original)
    edited.getPage(1).drawText('900 000 F CFA', { x: 60, y: 500, size: 14 })
    const tampered = Buffer.from(await edited.save())

    const compare = await request(app)
      .post(`/api/verify/${document.trackingCode}/comparer`)
      .attach('fichier', tampered, { filename: 'bail.pdf', contentType: 'application/pdf' })
      .expect(200)
    expect(compare.body.resultat).toBe('diverge')
    expect(compare.body.marquesInvisibles).toMatchObject({ presentes: true, memeDocument: true, pagesDOrigine: 3, pagesSansMarque: [] })

    const found = await request(app)
      .post('/api/verify/recherche-par-fichier')
      .attach('fichier', tampered, { filename: 'bail.pdf', contentType: 'application/pdf' })
      .expect(200)
    expect(found.body).toMatchObject({ trouve: true, trackingCode: document.trackingCode, fichierModifie: true })

    // Un PDF quelconque ne porte aucune marque.
    const foreign = await PDFDocument.create()
    foreign.addPage()
    const other = await request(app)
      .post(`/api/verify/${document.trackingCode}/comparer`)
      .attach('fichier', Buffer.from(await foreign.save()), { filename: 'x.pdf', contentType: 'application/pdf' })
      .expect(200)
    expect(other.body.marquesInvisibles.presentes).toBe(false)
  })
})
