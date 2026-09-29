import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app.js'
import { prisma } from '../../db.js'
import { createTestOrganization, createTestUser } from '../../test/factories.js'

const app = createApp()
// Code unique par exécution — évite toute collision avec un run précédent partageant le même fichier SQLite de test.
const uniqueCode = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`

describe('Verify — endpoint public', () => {
  it('renvoie UNKNOWN_CODE (jamais 404) pour un code inexistant', async () => {
    const res = await request(app).get('/api/verify/CODE-INEXISTANT')
    expect(res.status).toBe(200)
    expect(res.body.statut).toBe('UNKNOWN_CODE')
  })

  it('ne fait jamais de hash exact pour un dossier Trace', async () => {
    const org = await createTestOrganization()
    const { user } = await createTestUser({ organizationId: org.id, roles: ['AGENT_RECEPTION'] })
    const code = uniqueCode('TRC')
    await prisma.document.create({
      data: {
        organizationId: org.id,
        origine: 'TRACE',
        titre: 'Contrat papier',
        type: 'contrat',
        statut: 'RECEIVED',
        trackingCode: code,
        createdByUserId: user.id,
      },
    })

    const res = await request(app).get(`/api/verify/${code}`)
    expect(res.status).toBe(200)
    expect(res.body.origine).toBe('TRACE')
    expect(res.body.integrite.methode).toBe('examen_humain')
  })

  it('utilise le hash exact pour un dossier Sign', async () => {
    const org = await createTestOrganization()
    const { user } = await createTestUser({ organizationId: org.id, roles: ['SIGNATAIRE'] })
    const code = uniqueCode('SGN')
    await prisma.document.create({
      data: {
        organizationId: org.id,
        origine: 'SIGN',
        titre: 'PDF signé',
        type: 'contrat',
        statut: 'SIGNED',
        trackingCode: code,
        hashSha256: 'abc123',
        createdByUserId: user.id,
      },
    })

    const res = await request(app).get(`/api/verify/${code}`)
    expect(res.status).toBe(200)
    expect(res.body.integrite.methode).toBe('hash_exact')
  })
})
