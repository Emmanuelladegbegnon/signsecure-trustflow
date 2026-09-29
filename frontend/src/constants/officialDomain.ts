// Domaine officiel de vérification, affiché en clair sur les pages Verify et
// imprimé sous le QR des PDF signés (côté serveur : PUBLIC_VERIFY_BASE_URL).
// À définir au build via VITE_OFFICIAL_VERIFY_HOST ; à défaut, l'hôte courant
// (développement local).
export const OFFICIAL_VERIFY_HOST: string =
  (import.meta.env.VITE_OFFICIAL_VERIFY_HOST as string | undefined) ?? (typeof window !== 'undefined' ? window.location.host : '')
