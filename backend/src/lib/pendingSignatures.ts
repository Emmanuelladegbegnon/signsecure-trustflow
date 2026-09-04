/**
 * File d'attente en mémoire pour l'image de signature entre POST
 * .../signature et POST .../otp/verify (CLAUDE.md § Signature — règle
 * stricte) : jamais écrite en base de données ni sur disque, jamais mise en
 * cache au-delà du traitement immédiat. Consommée une seule fois (retirée dès
 * lecture) et expirée automatiquement si l'OTP n'est jamais validé.
 *
 * Limite assumée pour ce MVP : cet état ne survit pas à un redémarrage du
 * process et ne serait pas partagé entre plusieurs instances horizontalisées
 * — au pire une signature interrompue redemande simplement le dessin, aucune
 * donnée sensible ne persiste nulle part.
 */

interface PendingSignature {
  imageBase64: string
  expiresAt: number
}

const TTL_MS = 10 * 60 * 1000 // le temps de saisir l'OTP
const store = new Map<string, PendingSignature>()

export function stashPendingSignature(signatoryId: string, imageBase64: string): void {
  store.set(signatoryId, { imageBase64, expiresAt: Date.now() + TTL_MS })
}

/** Retire et retourne l'image en attente — consommation unique, jamais relue. */
export function takePendingSignature(signatoryId: string): string | null {
  const entry = store.get(signatoryId)
  store.delete(signatoryId)
  if (!entry || entry.expiresAt < Date.now()) return null
  return entry.imageBase64
}

export function hasPendingSignature(signatoryId: string): boolean {
  const entry = store.get(signatoryId)
  return Boolean(entry && entry.expiresAt >= Date.now())
}

// Filet de sécurité : purge les entrées jamais consommées (OTP jamais validé).
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [key, value] of store) {
    if (value.expiresAt < now) store.delete(key)
  }
}, 60_000)
cleanupInterval.unref()
