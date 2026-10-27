/**
 * Horodatage par un tiers (RFC 3161), optionnel : activé seulement si TSA_URL
 * est renseignée. Seule l'empreinte SHA-256 est envoyée au serveur
 * d'horodatage — jamais le document, jamais de donnée personnelle.
 *
 * La réponse (DER) est conservée telle quelle : elle se vérifie hors
 * SignSecure, par exemple avec
 *   openssl ts -verify -in jeton.tsr -data document.pdf -CAfile ca-du-tsa.pem
 *
 * Un TSA injoignable n'empêche jamais la signature : le jeton est alors
 * simplement absent (et le rapport de preuve l'indique).
 */
import { randomBytes } from 'node:crypto'
import forge from 'node-forge'
import { env } from '../env.js'

const { asn1 } = forge
const SHA256_OID = '2.16.840.1.101.3.4.2.1'

export interface TimestampToken {
  /** Réponse TimeStampResp complète, encodée DER. */
  der: Buffer
  genTime: Date
  tsaUrl: string
}

export function isTsaEnabled(): boolean {
  return Boolean(env.tsaUrl)
}

function buildRequest(sha256Hex: string): Buffer {
  const nonce = randomBytes(8)
  nonce[0] = nonce[0]! & 0x7f // entier positif
  const req = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, asn1.integerToDer(1).getBytes()),
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false, asn1.oidToDer(SHA256_OID).getBytes()),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, ''),
      ]),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, Buffer.from(sha256Hex, 'hex').toString('binary')),
    ]),
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, nonce.toString('binary')),
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BOOLEAN, false, String.fromCharCode(0xff)), // certReq
  ])
  return Buffer.from(asn1.toDer(req).getBytes(), 'binary')
}

type Node = forge.asn1.Asn1

function child(node: Node, index: number): Node {
  const value = node.value
  if (!Array.isArray(value) || !value[index]) throw new Error('Réponse d\'horodatage mal formée.')
  return value[index]!
}

/** Extrait genTime et vérifie que le jeton porte bien sur l'empreinte demandée. */
function parseResponse(der: Buffer, sha256Hex: string): Date {
  const resp = asn1.fromDer(der.toString('binary'))
  const status = child(child(resp, 0), 0)
  const statusValue = asn1.derToInteger(status.value as string)
  if (statusValue !== 0 && statusValue !== 1) throw new Error(`Horodatage refusé par le TSA (statut ${statusValue}).`)

  const contentInfo = child(resp, 1)
  const signedData = child(child(contentInfo, 1), 0)
  const encapContentInfo = child(signedData, 2)
  const eContent = child(child(encapContentInfo, 1), 0)
  const tstInfoDer = Array.isArray(eContent.value)
    ? eContent.value.map((part) => part.value as string).join('') // OCTET STRING construit (BER)
    : (eContent.value as string)
  const tstInfo = asn1.fromDer(tstInfoDer)

  const hashedMessage = child(child(tstInfo, 2), 1).value as string
  if (Buffer.from(hashedMessage, 'binary').toString('hex') !== sha256Hex) {
    throw new Error("Le jeton d'horodatage ne porte pas sur l'empreinte demandée.")
  }
  return asn1.generalizedTimeToDate(child(tstInfo, 4).value as string)
}

/** Demande un jeton d'horodatage pour une empreinte SHA-256. Retourne null si désactivé ou en cas d'échec. */
export async function requestTimestamp(sha256Hex: string): Promise<TimestampToken | null> {
  if (!isTsaEnabled()) return null
  try {
    const response = await fetch(env.tsaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/timestamp-query' },
      body: buildRequest(sha256Hex),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const der = Buffer.from(await response.arrayBuffer())
    return { der, genTime: parseResponse(der, sha256Hex), tsaUrl: env.tsaUrl }
  } catch (err) {
    console.warn(`[TSA] Horodatage tiers indisponible, poursuite sans jeton : ${(err as Error).message}`)
    return null
  }
}
