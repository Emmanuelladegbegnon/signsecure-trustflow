/**
 * Alertes de sécurité : certains événements du journal déclenchent un email
 * immédiat aux administrateurs de l'organisation (et aux superviseurs pour ce
 * qui touche aux documents). Une alarme qui ne sonne pas ne sert à rien : sans
 * ces emails, un compte bloqué ou un rôle modifié passerait inaperçu jusqu'à
 * la prochaine lecture du journal.
 *
 * L'envoi ne bloque jamais l'action d'origine et un échec d'envoi est
 * seulement journalisé côté serveur.
 */
import type { AuditEvent, Role } from '@prisma/client'
import { prisma } from '../db.js'
import { sendEmail } from './notify.js'

interface AlertRule {
  titre: string
  destinataires: Role[]
  /** Pour les événements qui ne sont alarmants que selon leurs détails. */
  si?: (details: Record<string, unknown>) => boolean
}

const RULES: Record<string, AlertRule> = {
  ACCOUNT_LOCKED: { titre: 'Compte bloqué après plusieurs échecs de connexion', destinataires: ['ADMINISTRATEUR'] },
  USER_ROLES_UPDATED: { titre: "Rôles d'un compte modifiés", destinataires: ['ADMINISTRATEUR'] },
  USER_SUSPENDED: { titre: 'Compte suspendu', destinataires: ['ADMINISTRATEUR'] },
  USER_REACTIVATED: { titre: 'Compte réactivé', destinataires: ['ADMINISTRATEUR'] },
  REAUTH_LOCKED: { titre: 'Reconfirmation bloquée après plusieurs codes faux', destinataires: ['ADMINISTRATEUR'] },
  DOCUMENT_REVOKED: { titre: 'Document révoqué', destinataires: ['ADMINISTRATEUR', 'SUPERVISEUR'] },
  INCIDENT_REPORTED: { titre: 'Incident déclaré sur un document Trace', destinataires: ['SUPERVISEUR'] },
  SEAL_CERT_ROTATED: { titre: 'Changement du certificat de cachet', destinataires: ['ADMINISTRATEUR'] },
  AUDIT_CHAIN_ANCHORED: {
    titre: "Rupture détectée dans le journal d'audit",
    destinataires: ['ADMINISTRATEUR', 'SUPERVISEUR'],
    si: (d) => d.chainIntact === false,
  },
  AUDIT_ANCHOR_CHECKED: {
    titre: "Hash d'ancrage introuvable : le journal a peut-être été réécrit",
    destinataires: ['ADMINISTRATEUR', 'SUPERVISEUR'],
    si: (d) => d.trouve === false,
  },
}

export function isAlertAction(action: string): boolean {
  return action in RULES
}

async function sendAlert(event: AuditEvent) {
  const rule = RULES[event.action]
  if (!rule) return
  const details = event.details ? (JSON.parse(event.details) as Record<string, unknown>) : {}
  if (rule.si && !rule.si(details)) return

  const recipients = await prisma.user.findMany({
    where: { organizationId: event.organizationId, statut: 'ACTIF', roles: { some: { role: { in: rule.destinataires } } } },
    select: { email: true },
  })
  const body =
    `Alerte de sécurité SignSecure : ${rule.titre}.\n\n` +
    `Date (serveur) : ${event.timestampServer.toISOString()}\n` +
    `Déclenchée par : ${event.actorLabel}\n` +
    `Objet : ${event.objectType} ${event.objectId}\n` +
    `Adresse IP : ${event.ip}\n` +
    `Référence du journal : ${event.eventHash}\n\n` +
    `Si vous ne reconnaissez pas cette action, consultez le journal d'audit et prévenez un administrateur.`
  await Promise.all(recipients.map((r) => sendEmail(r.email, `[Alerte SignSecure] ${rule.titre}`, body)))
}

/** Déclenché après chaque écriture du journal ; ne lève jamais d'erreur. */
export function queueSecurityAlert(event: AuditEvent): void {
  if (!isAlertAction(event.action)) return
  sendAlert(event).catch((err) => console.error(`[Alerte] Envoi impossible pour ${event.action} :`, err))
}
