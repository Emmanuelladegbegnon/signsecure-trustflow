// Référentiel unique des rôles (CLAUDE.md § Modèle de rôles).
// Un compte est attribué à un ou plusieurs de ces rôles par un administrateur —
// jamais choisi par l'utilisateur lui-même après connexion.
export const ROLES = ['Agent de réception', 'Signataire', 'Superviseur', 'Vérificateur', 'Administrateur'] as const

export type Role = (typeof ROLES)[number]
