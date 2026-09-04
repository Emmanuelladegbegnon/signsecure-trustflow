/**
 * Amorce les données minimales pour pouvoir utiliser l'application :
 * - une organisation de démonstration
 * - un compte Administrateur déjà actif (aucune inscription libre n'existant
 *   par ailleurs — CLAUDE.md § RBAC —, ce premier compte doit être créé hors
 *   du parcours normal d'invitation)
 * - les profils de permissions prédéfinis consommés par GET /api/admin/roles/profils
 *
 * Usage : npm run seed (voir package.json)
 */
import { prisma } from '../src/db.js'
import { hashPassword } from '../src/lib/password.js'

const ADMIN_EMAIL = 'admin@signsecure.demo'
const ADMIN_PASSWORD = 'ChangeMe123!'

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: 'org-demo' },
    update: {},
    create: { id: 'org-demo', nom: 'Durabilis & Co (démo)' },
  })

  const existingAdmin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } })
  if (!existingAdmin) {
    const passwordHash = await hashPassword(ADMIN_PASSWORD)
    const admin = await prisma.user.create({
      data: {
        organizationId: org.id,
        nom: 'Administrateur',
        prenom: 'Compte',
        email: ADMIN_EMAIL,
        telephone: '+229 00 00 00 00',
        passwordHash,
        statut: 'ACTIF',
        roles: { create: [{ role: 'ADMINISTRATEUR' }] },
      },
    })
    console.log(`Compte administrateur créé : ${admin.email} / ${ADMIN_PASSWORD}`)
  } else {
    console.log('Compte administrateur déjà présent, non recréé.')
  }

  const profiles: Array<{ id: string; nom: string; description: string; permissions: string[] }> = [
    {
      id: 'profil-agent-reception',
      nom: 'Agent de réception',
      description: 'Enregistrement de documents physiques (Trace) : réception, capture, observations.',
      permissions: ['trace.enregistrer', 'trace.capturer', 'trace.observer'],
    },
    {
      id: 'profil-signataire',
      nom: 'Signataire standard',
      description: 'Accès aux liens de signature qui lui sont adressés — aucun accès au back-office.',
      permissions: ['sign.signer'],
    },
    {
      id: 'profil-superviseur',
      nom: 'Superviseur',
      description: 'Validation des dossiers Trace, révocation des dossiers Sign, gestion des incidents.',
      permissions: ['trace.valider', 'sign.revoquer', 'trace.incident.gerer'],
    },
    {
      id: 'profil-verificateur',
      nom: 'Vérificateur',
      description: "Consultation des dossiers et de l'audit à des fins de contrôle interne.",
      permissions: ['documents.consulter', 'audit.consulter'],
    },
    {
      id: 'profil-administrateur',
      nom: 'Administrateur',
      description: 'Gestion des comptes utilisateurs, des rôles, et accès complet au journal d\'audit.',
      permissions: ['admin.utilisateurs.gerer', 'admin.roles.gerer', 'audit.consulter'],
    },
  ]

  for (const profile of profiles) {
    await prisma.permissionProfile.upsert({
      where: { id: profile.id },
      update: { nom: profile.nom, description: profile.description, permissions: profile.permissions },
      create: profile,
    })
  }
  console.log(`${profiles.length} profils de permissions synchronisés.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
