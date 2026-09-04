import { prisma } from '../db.js'
import { hashPassword } from '../lib/password.js'
import type { Role } from '@prisma/client'

let counter = 0
function unique(prefix: string): string {
  counter += 1
  return `${prefix}-${Date.now()}-${counter}`
}

export async function createTestOrganization() {
  return prisma.organization.create({ data: { nom: unique('org') } })
}

/** Utilisateur déjà actif, hors parcours d'invitation — pour les tests qui n'exercent pas l'activation elle-même. */
export async function createTestUser(opts: { organizationId: string; roles: Role[]; password?: string }) {
  const password = opts.password ?? 'TestPassword123!'
  const email = `${unique('user')}@test.local`
  const user = await prisma.user.create({
    data: {
      organizationId: opts.organizationId,
      nom: 'Test',
      prenom: 'Utilisateur',
      email,
      telephone: '+229 00 00 00 00',
      passwordHash: await hashPassword(password),
      statut: 'ACTIF',
      roles: { create: opts.roles.map((role) => ({ role })) },
    },
  })
  return { user, email, password }
}
