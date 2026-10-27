// Types de pièce acceptés par POST /api/sign/link/:token/identite (même liste que le serveur).
export const IDENTITY_DOC_TYPES = [
  { value: 'CNI', label: "Carte nationale d'identité" },
  { value: 'CIP', label: "Certificat d'identification personnelle (CIP)" },
  { value: 'PASSEPORT', label: 'Passeport' },
  { value: 'PERMIS', label: 'Permis de conduire' },
  { value: 'CARTE_CONSULAIRE', label: 'Carte consulaire' },
  { value: 'AUTRE', label: 'Autre pièce officielle avec photo' },
] as const
