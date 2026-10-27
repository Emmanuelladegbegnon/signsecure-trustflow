import { describe, expect, it } from 'vitest'
import { prisma } from '../db.js'
import { recordAuditEvent, verifyAuditChain } from './audit.js'
import { createTestOrganization } from '../test/factories.js'

describe('audit — chaîne de hash', () => {
  it('reste intacte après plusieurs événements', async () => {
    const org = await createTestOrganization()
    for (let i = 0; i < 3; i++) {
      await recordAuditEvent({
        organizationId: org.id,
        actorId: null,
        actorLabel: 'Test',
        action: `EVENT_${i}`,
        objectType: 'Test',
        objectId: `obj-${i}`,
        ip: '127.0.0.1',
      })
    }
    const result = await verifyAuditChain(org.id)
    expect(result.intact).toBe(true)
  })

  it('détecte une altération a posteriori du journal', async () => {
    const org = await createTestOrganization()
    await recordAuditEvent({
      organizationId: org.id,
      actorId: null,
      actorLabel: 'Test',
      action: 'EVENT_A',
      objectType: 'Test',
      objectId: 'obj-a',
      ip: '127.0.0.1',
    })
    const event = await prisma.auditEvent.findFirstOrThrow({ where: { organizationId: org.id } })
    await prisma.auditEvent.update({ where: { id: event.id }, data: { action: 'EVENT_ALTERE' } })

    const result = await verifyAuditChain(org.id)
    expect(result.intact).toBe(false)
    expect(result.brokenAtEventId).toBe(event.id)
  })

  it('sérialise les écritures concurrentes sans corrompre la chaîne', async () => {
    const org = await createTestOrganization()
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        recordAuditEvent({
          organizationId: org.id,
          actorId: null,
          actorLabel: 'Test',
          action: `CONCURRENT_${i}`,
          objectType: 'Test',
          objectId: `obj-${i}`,
          ip: '127.0.0.1',
        }),
      ),
    )
    const result = await verifyAuditChain(org.id)
    expect(result.intact).toBe(true)
  })
})
