// Valeurs du champ `type` envoyé à POST /api/trace/enregistrement.
// API_CONTRACT.md ne fixe pas d'énumération précise — liste à confirmer avec le back.
export const TRACE_DOCUMENT_TYPES = [
  { value: 'contrat', label: 'Contrat Commercial' },
  { value: 'avenant', label: 'Avenant' },
  { value: 'attestation', label: 'Attestation Fiscale' },
  { value: 'pv', label: 'Procès-verbal' },
] as const
