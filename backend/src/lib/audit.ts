import { createHash } from 'node:crypto'
import { prisma } from '../db.js'

const GENESIS_HASH = '0'.repeat(64)

// Le chaînage doit être strictement séquentiel par organisation (chaque
// événement référence le hash du précédent) — une file en mémoire par
// organisation évite qu'une écriture concurrente dans ce même process ne lise
// un "dernier événement" périmé. Suffisant pour un seul process (le cas de ce
// MVP) ; une vraie horizontalisation multi-instance demanderait une
// sérialisation au niveau de la base plutôt qu'en mémoire applicative.
const writeQueues = new Map<string, Promise<unknown>>()

function withOrgLock<T>(organizationId: string, fn: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(organizationId) ?? Promise.resolve()
  const settledPrevious = previous.catch(() => undefined)
  const next = settledPrevious.then(fn)
  writeQueues.set(
    organizationId,
    next.catch(() => undefined),
  )
  return next
}

function computeEventHash(previousEventHash: string, payload: Record<string, unknown>): string {
  return createHash('sha256')
    .update(previousEventHash + JSON.stringify(payload))
    .digest('hex')
}

export interface AuditEventInput {
  organizationId: string
  /** null pour un acteur non-utilisateur (système, API partenaire). */
  actorId?: string | null
  actorLabel: string
  action: string
  objectType: string
  objectId: string
  documentId?: string | null
  ip: string
}

/** Ajoute un événement au journal d'audit, chaîné par hash (CLAUDE.md § Sécurité). */
export function recordAuditEvent(input: AuditEventInput) {
  return withOrgLock(input.organizationId, async () => {
    const last = await prisma.auditEvent.findFirst({
      where: { organizationId: input.organizationId },
      orderBy: { timestampServer: 'desc' },
    })
    const previousEventHash = last?.eventHash ?? GENESIS_HASH
    const timestampServer = new Date()

    const eventHash = computeEventHash(previousEventHash, {
      organizationId: input.organizationId,
      actorId: input.actorId ?? null,
      actorLabel: input.actorLabel,
      action: input.action,
      objectType: input.objectType,
      objectId: input.objectId,
      ip: input.ip,
      timestampServer: timestampServer.toISOString(),
    })

    return prisma.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.actorId ?? null,
        actorLabel: input.actorLabel,
        action: input.action,
        objectType: input.objectType,
        objectId: input.objectId,
        documentId: input.documentId ?? null,
        ip: input.ip,
        timestampServer,
        previousEventHash,
        eventHash,
      },
    })
  })
}

/** Rejoue la chaîne et vérifie qu'aucun événement n'a été altéré a posteriori. */
export async function verifyAuditChain(organizationId: string): Promise<{ intact: boolean; brokenAtEventId?: string }> {
  const events = await prisma.auditEvent.findMany({
    where: { organizationId },
    orderBy: { timestampServer: 'asc' },
  })

  let expectedPrevious = GENESIS_HASH
  for (const event of events) {
    if (event.previousEventHash !== expectedPrevious) {
      return { intact: false, brokenAtEventId: event.id }
    }
    const recomputed = computeEventHash(event.previousEventHash, {
      organizationId: event.organizationId,
      actorId: event.actorId,
      actorLabel: event.actorLabel,
      action: event.action,
      objectType: event.objectType,
      objectId: event.objectId,
      ip: event.ip,
      timestampServer: event.timestampServer.toISOString(),
    })
    if (recomputed !== event.eventHash) {
      return { intact: false, brokenAtEventId: event.id }
    }
    expectedPrevious = event.eventHash
  }

  return { intact: true }
}
