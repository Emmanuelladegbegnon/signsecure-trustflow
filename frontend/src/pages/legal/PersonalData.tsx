import { Link } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { ROUTES } from '../../routes'

interface Treatment {
  finalite: string
  donnees: string
  conservation: string
}

// Durées indicatives pour le prototype — à fixer par l'organisation
// responsable du traitement avant toute mise en production.
const TREATMENTS: Treatment[] = [
  {
    finalite: 'Comptes internes (connexion, rôles)',
    donnees: 'Nom, prénom, email, téléphone, journal de connexion',
    conservation: "Durée du compte, puis 1 an après sa suppression",
  },
  {
    finalite: 'Signature de documents (Sign)',
    donnees:
      "Nom, email et téléphone déclarés par l'émetteur, adresse IP, navigateur, dates de consentement et de validation. L'image de la signature n'est pas conservée à part : elle est intégrée au PDF signé puis effacée.",
    conservation: 'Durée de conservation du document signé fixée par l’organisation',
  },
  {
    finalite: 'Preuve de réception de documents papier (Trace)',
    donnees: 'Photos des pages, métadonnées déclarées, identité du compte déclarant, horodatage serveur',
    conservation: 'Durée de conservation du dossier fixée par l’organisation',
  },
  {
    finalite: 'Vérification publique (Verify)',
    donnees:
      "Code saisi, adresse IP et navigateur (journal d'audit). Un fichier soumis pour contrôle sert uniquement au calcul de son empreinte : il n'est pas conservé.",
    conservation: "Durée de conservation du journal d'audit",
  },
]

/**
 * Page publique « Données personnelles » (Code du numérique, loi 2017-20 :
 * art. 405 déclaration préalable, art. 415 information des personnes,
 * art. 433 durée de conservation limitée).
 */
export function PersonalData() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <main className="max-w-3xl mx-auto px-margin-mobile py-12 flex flex-col gap-8">
        <div>
          <Link to={ROUTES.verifyPublic} className="font-label-md text-label-md text-primary hover:underline flex items-center gap-1 mb-6">
            <Icon name="arrow_back" size={18} />
            Retour à la vérification
          </Link>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Données personnelles</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            SignSecure TrustFlow est un prototype de démonstration. Cette page décrit les données traitées et pourquoi.
          </p>
        </div>

        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
          <table className="w-full text-left border-collapse font-body-sm text-body-sm">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-3 font-label-md text-label-md">Finalité</th>
                <th className="p-3 font-label-md text-label-md">Données</th>
                <th className="p-3 font-label-md text-label-md">Conservation</th>
              </tr>
            </thead>
            <tbody>
              {TREATMENTS.map((t) => (
                <tr key={t.finalite} className="border-b border-outline-variant last:border-0 align-top">
                  <td className="p-3 font-medium text-on-surface">{t.finalite}</td>
                  <td className="p-3 text-on-surface-variant">{t.donnees}</td>
                  <td className="p-3 text-on-surface-variant">{t.conservation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="flex flex-col gap-3 font-body-md text-body-md text-on-surface-variant">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Ce que SignSecure ne fait pas</h2>
          <ul className="list-disc pl-6 flex flex-col gap-1">
            <li>Aucune donnée biométrique n'est collectée, et aucune reconnaissance faciale ni d'empreinte n'est utilisée.</li>
            <li>Le numéro personnel d'identification (NPI) n'est ni demandé ni conservé.</li>
            <li>L'identité des signataires n'est pas vérifiée : elle est déclarée par l'émetteur du document.</li>
            <li>SignSecure n'est pas un prestataire de services de confiance qualifié et ne délivre aucun certificat.</li>
          </ul>

          <h2 className="font-headline-sm text-headline-sm text-on-surface mt-4">Vos droits</h2>
          <p>
            Vous pouvez demander l'accès, la rectification ou l'effacement de vos données auprès de l'organisation qui vous a envoyé le document
            ou créé votre compte. Elle est responsable du traitement.
          </p>

          <h2 className="font-headline-sm text-headline-sm text-on-surface mt-4">Avant une mise en production</h2>
          <p>
            Tout traitement de données personnelles doit être déclaré au préalable à l'APDP (art. 405). L'hébergement des données hors du Bénin
            demande une autorisation préalable (art. 407). Les durées de conservation ci-dessus sont indicatives et doivent être fixées par
            l'organisation.
          </p>
        </section>
      </main>
    </div>
  )
}
