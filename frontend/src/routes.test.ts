import { describe, expect, it } from 'vitest'
import {
  assignSignersUrl,
  compareFilesUrl,
  proofReportUrl,
  signerInviteUrl,
  traceabilityDetailUrl,
  traceCaptureUrl,
  traceIncidentUrl,
  traceObservationsUrl,
  traceTransferReceptionUrl,
  traceTransferRequestUrl,
  verifyResultUrl,
} from './routes'

describe('route URL helpers', () => {
  it('build the expected paths from an id/token/code', () => {
    expect(signerInviteUrl('tok_123')).toBe('/signer/tok_123')
    expect(assignSignersUrl('doc_1')).toBe('/documents/doc_1/signataires')
    expect(proofReportUrl('doc_1')).toBe('/documents/doc_1/rapport-de-preuve')
    expect(traceabilityDetailUrl('trc_1')).toBe('/tracabilite/trc_1/detail')
    expect(traceCaptureUrl('trc_1')).toBe('/mobile/enregistrement/trc_1/capture')
    expect(traceObservationsUrl('trc_1')).toBe('/mobile/enregistrement/trc_1/observations')
    expect(traceIncidentUrl('trc_1')).toBe('/mobile/trace/trc_1/incident')
    expect(traceTransferRequestUrl('trc_1')).toBe('/mobile/trace/trc_1/transfert')
    expect(traceTransferReceptionUrl('tr_1')).toBe('/mobile/transfert/tr_1/reception')
  })

  it('URL-encodes a tracking code containing special characters', () => {
    expect(verifyResultUrl('SSTF-8492/XXXX')).toBe('/verifier/resultat/SSTF-8492%2FXXXX')
    expect(compareFilesUrl('code with space')).toBe('/verifier/code%20with%20space/comparaison')
  })
})
