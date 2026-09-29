// Valeurs du champ `type` envoyé à POST /api/documents et utilisé comme
// filtre sur GET /api/documents?type=... . API_CONTRACT.md ne fixe pas
// d'énumération précise pour ce champ — liste à confirmer avec le back.
//
// `exclusNumerique` : catégories que l'art. 267 du Code du numérique (loi
// 2017-20) exclut de la forme électronique — un avertissement est affiché et
// une confirmation explicite demandée avant de continuer.
export const DOCUMENT_TYPES = [
  { value: 'contrat', label: 'Contrat', exclusNumerique: false },
  { value: 'bon_commande', label: 'Bon de commande', exclusNumerique: false },
  { value: 'nda', label: 'Accord de confidentialité (NDA)', exclusNumerique: false },
  { value: 'surete', label: 'Acte de sûreté (caution, gage, hypothèque…)', exclusNumerique: true },
  { value: 'famille', label: 'Acte relevant du droit de la famille', exclusNumerique: true },
  { value: 'succession', label: 'Acte relevant des successions', exclusNumerique: true },
  { value: 'autre', label: 'Autre', exclusNumerique: false },
] as const

export function isExcludedFromDigital(type: string): boolean {
  return DOCUMENT_TYPES.some((t) => t.value === type && t.exclusNumerique)
}
