/**
 * Cachet de plateforme PAdES apposé sur la version finale d'un PDF signé.
 *
 * Le certificat est AUTO-SIGNÉ et généré localement : c'est un cachet de
 * DÉMONSTRATION, NON QUALIFIÉ. SignSecure n'est pas un prestataire de
 * confiance et ne délivre aucun certificat aux signataires (CLAUDE.md,
 * Code du numérique art. 324). Ce que le cachet apporte : n'importe quel
 * lecteur PDF détecte une modification du fichier après scellement, sans
 * interroger SignSecure. Acrobat affichera « validité inconnue » faute
 * d'autorité reconnue — c'est attendu.
 *
 * La clé privée vit dans un fichier .p12 hors dépôt git (keys/, voir
 * .gitignore), protégé par SEAL_P12_PASSPHRASE.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { generateKeyPairSync, randomBytes } from 'node:crypto'
import path from 'node:path'
import forge from 'node-forge'
import { PDFDocument } from 'pdf-lib'
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib'
import { P12Signer } from '@signpdf/signer-p12'
import { SignPdf } from '@signpdf/signpdf'
import { env } from '../env.js'

export const SEAL_SIGNER_NAME = 'SignSecure TrustFlow - cachet de demonstration (non qualifie)'
const DEV_PASSPHRASE = 'demo-cachet-non-qualifie'

function passphrase(): string {
  return env.sealP12Passphrase ?? DEV_PASSPHRASE
}

/** Génère le certificat auto-signé de démonstration s'il n'existe pas encore. */
function ensureSealP12(): Buffer {
  const p12Path = path.resolve(env.sealP12Path)
  if (existsSync(p12Path)) return readFileSync(p12Path)

  if (!env.sealP12Passphrase) {
    console.warn('[Cachet] SEAL_P12_PASSPHRASE absente : phrase de passe de développement utilisée pour le cachet de démonstration.')
  }

  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const key = forge.pki.privateKeyFromPem(privateKey.export({ type: 'pkcs1', format: 'pem' }).toString())
  const cert = forge.pki.createCertificate()
  cert.publicKey = forge.pki.publicKeyFromPem(publicKey.export({ type: 'spki', format: 'pem' }).toString())
  cert.serialNumber = `01${randomBytes(8).toString('hex')}`
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000)
  const subject = [
    { name: 'commonName', value: SEAL_SIGNER_NAME },
    { name: 'organizationName', value: 'SignSecure TrustFlow (prototype de demonstration)' },
    { name: 'organizationalUnitName', value: 'Cachet non qualifie - aucune autorite de certification' },
  ]
  cert.setSubject(subject)
  cert.setIssuer(subject) // auto-signé
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true },
  ])
  cert.sign(key, forge.md.sha256.create())

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(key, [cert], passphrase(), { algorithm: '3des' })
  const p12 = Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), 'binary')
  mkdirSync(path.dirname(p12Path), { recursive: true })
  writeFileSync(p12Path, p12, { mode: 0o600 })
  console.log(`[Cachet] Certificat auto-signé de démonstration généré : ${p12Path}`)
  return p12
}

/**
 * Appose le cachet sur un PDF déjà finalisé (signatures incrustées, pied de
 * page de vérification ajouté). Le résultat ne doit plus être modifié : le
 * hash SHA-256 de référence se calcule sur les octets retournés.
 */
export async function sealPdf(pdfBytes: Uint8Array, signingTime: Date): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  pdflibAddPlaceholder({
    pdfDoc,
    reason: 'Cachet de plateforme SignSecure - demonstration, non qualifie. Toute modification ulterieure est detectable.',
    contactInfo: env.publicVerifyBaseUrl,
    name: SEAL_SIGNER_NAME,
    location: 'Plateforme SignSecure TrustFlow',
    signingTime,
    appName: 'SignSecure TrustFlow',
  })
  const withPlaceholder = Buffer.from(await pdfDoc.save({ useObjectStreams: false }))
  const signer = new P12Signer(ensureSealP12(), { passphrase: passphrase() })
  return new SignPdf().sign(withPlaceholder, signer, signingTime)
}
