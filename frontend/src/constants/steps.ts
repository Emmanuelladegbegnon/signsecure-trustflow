// Libellés des parcours multi-écrans, partagés par tous les écrans concernés
// (voir components/ui/Stepper.tsx) — une seule source pour éviter que deux
// écrans du même parcours affichent un nombre d'étapes ou des libellés
// différents.

/** NewDocument.tsx (étape 0) → AssignSigners.tsx (étape 1). */
export const SIGN_STEPS = ['Document', 'Signataires']

/** RegistrationStep1.tsx (étape 0) → CameraCapture.tsx (étape 1) → Observations.tsx (étape 2). */
export const TRACE_REGISTRATION_STEPS = ['Informations', 'Photos', 'Vérification']

/**
 * ApplySignature.tsx (étape 0) → SignatureOtp.tsx (étape 1) → SignatureSuccess.tsx
 * (écran final, transactionnel — pas de repère d'étape dessus, cf. constant
 * ci-dessus pour le même choix sur RegistrationConfirmation/CodeLabel).
 * Parcours du signataire externe (/signer/:token, CLAUDE.md § Sign) — sans
 * compte, sans familiarité avec l'app, donc le repère compte davantage ici
 * qu'ailleurs.
 */
export const EXTERNAL_SIGNER_STEPS = ['Signature', 'Confirmation', 'Signé']
