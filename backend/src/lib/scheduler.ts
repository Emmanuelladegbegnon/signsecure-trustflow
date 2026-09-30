/**
 * Tâches planifiées en mémoire (MVP mono-instance) : relance des signataires
 * avant expiration de leur lien, et ancrage externe périodique du journal
 * d'audit. Démarré par index.ts uniquement — jamais pendant les tests.
 */
import { env } from '../env.js'
import { anchorAllAuditChains } from './auditAnchor.js'
import { createBackup } from './backup.js'
import { sendSignatureReminders } from '../modules/sign/service.js'
import { purgeStaleIdentityDocuments } from '../modules/identity/service.js'

function runSafely(name: string, task: () => Promise<unknown>) {
  task().catch((err) => console.error(`[Planificateur] Échec de la tâche « ${name} » :`, err))
}

export function startScheduler() {
  if (!env.schedulerEnabled) return

  const reminders = setInterval(() => {
    runSafely('relances de signature', sendSignatureReminders)
    runSafely("suppression des pièces d'identité non contrôlées", purgeStaleIdentityDocuments)
  }, 60 * 60_000)
  const anchors = setInterval(() => runSafely('ancrage du journal', anchorAllAuditChains), env.auditAnchorIntervalHours * 3_600_000)
  reminders.unref()
  anchors.unref()
  // Sauvegarde chiffrée automatique, seulement si un dossier et une clé de sauvegarde sont configurés.
  if (env.backupDir && env.backupKey) {
    setInterval(() => runSafely('sauvegarde chiffrée', createBackup), env.backupIntervalHours * 3_600_000).unref()
  }

  // Premier passage peu après le démarrage, pour ne pas attendre une heure.
  setTimeout(() => runSafely('relances de signature', sendSignatureReminders), 30_000).unref()
  console.log(`[Planificateur] Relances horaires ; ancrage du journal toutes les ${env.auditAnchorIntervalHours} h.`)
}
