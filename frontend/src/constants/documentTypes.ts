// Valeurs du champ `type` envoyé à POST /api/documents et utilisé comme
// filtre sur GET /api/documents?type=... . API_CONTRACT.md ne fixe pas
// d'énumération précise pour ce champ — liste à confirmer avec le back.
export const DOCUMENT_TYPES = [
  { value: 'contrat', label: 'Contrat' },
  { value: 'bon_commande', label: 'Bon de commande' },
  { value: 'nda', label: 'Accord de confidentialité (NDA)' },
  { value: 'autre', label: 'Autre' },
] as const
