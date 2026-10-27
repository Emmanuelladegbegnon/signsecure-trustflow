/**
 * Mémoire "session d'onglet" du dernier dessin de signature — exception
 * délibérée et volontairement restreinte à la règle CLAUDE.md § Sign
 * ("jamais stockée ni mise en cache au-delà du traitement immédiat") :
 *
 * - Une simple variable de module, en mémoire JS. Rien n'est écrit sur
 *   disque (pas de localStorage/IndexedDB/cookie), rien n'est envoyé au
 *   serveur avant qu'une signature précise soit validée.
 * - Disparaît automatiquement à la fermeture de l'onglet ou au rechargement
 *   de la page — pas de minuteur, pas de configuration, juste le cycle de
 *   vie normal du tas JS du navigateur.
 * - But : éviter de redessiner à l'identique quand on signe plusieurs
 *   documents à la suite dans la même session, sans réintroduire un
 *   quelconque stockage durable de la signature manuscrite.
 *
 * Ne PAS étendre cette mémoire à du stockage persistant (localStorage,
 * cache serveur, champ de base de données) sans revalider explicitement
 * avec le porteur du projet — c'est exactement ce que la règle interdit.
 */
let lastSignatureImage: string | null = null

export function getRememberedSignature(): string | null {
  return lastSignatureImage
}

export function rememberSignature(imageBase64: string): void {
  lastSignatureImage = imageBase64
}

export function forgetRememberedSignature(): void {
  lastSignatureImage = null
}
