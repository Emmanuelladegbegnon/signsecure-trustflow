import { Icon } from '../../components/ui/Icon'

const AUDIT_TRAIL = [
  { time: '23 Oct 2023, 09:00 UTC', title: 'Document Créé', detail: 'Créé par Système Automatisé (API)', icon: 'add_circle', tone: 'primary' as const },
  { time: '24 Oct 2023, 10:10 UTC', title: 'Document Ouvert', detail: 'Ouvert par Awa KONE (IP: 192.168.1.45)', icon: 'visibility', tone: 'neutral' as const },
  { time: '24 Oct 2023, 10:15 UTC', title: 'Signature Apposée', detail: 'Signé par Awa KONE. Authentification: SMS OTP.', icon: 'draw', tone: 'primary' as const },
  { time: '24 Oct 2023, 14:30 UTC', title: 'Signature Apposée', detail: 'Signé par Moussa DIOP. Authentification: Biométrie.', icon: 'draw', tone: 'primary' as const },
  { time: '24 Oct 2023, 14:32 UTC', title: 'Document Scellé', detail: 'Certificat final généré et scellé cryptographiquement.', icon: 'lock', tone: 'filled' as const },
]

const SIGNATORIES = [
  { name: 'Awa KONE', ip: '192.168.1.45', timestamp: '24 Oct 2023, 10:15 UTC', method: 'SMS OTP', icon: 'smartphone' },
  { name: 'Moussa DIOP', ip: '41.202.73.112', timestamp: '24 Oct 2023, 14:30 UTC', method: 'Biométrie', icon: 'fingerprint' },
]

export function ProofReport() {
  return (
    <div className="bg-background text-on-background min-h-screen">
      <main className="w-full flex justify-center py-margin-desktop px-margin-mobile">
        <div className="max-w-[800px] w-full bg-surface-container-lowest shadow-lg rounded-xl overflow-hidden border border-outline-variant print:shadow-none print:border-0">
          <header className="p-8 border-b border-outline-variant flex justify-between items-start bg-surface">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Rapport de Preuve de Signature</h1>
              <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2">
                <Icon name="verified" size={18} />
                Généré le 24 Octobre 2023 à 14:32 UTC
              </p>
            </div>
            <div className="text-right">
              <div className="font-headline-md text-headline-md font-bold text-primary mb-1">SignSecure TrustFlow</div>
              <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Certificat Légal</div>
            </div>
          </header>

          <div className="p-8 space-y-10">
            <section>
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4 flex items-center gap-2 border-b border-outline-variant pb-2">
                <Icon name="description" />
                Informations Document
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-body-sm text-body-sm">
                <div className="bg-surface-container-low p-4 rounded-lg">
                  <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">TITRE DU DOCUMENT</span>
                  <span className="font-body-md text-body-md font-medium text-on-surface">Contrat_Partenariat_Awa_Kone_2023.pdf</span>
                </div>
                <div className="bg-surface-container-low p-4 rounded-lg">
                  <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">CODE DE RÉFÉRENCE</span>
                  <span className="font-body-md text-body-md font-medium text-on-surface">DOC-2023-8942-XF</span>
                </div>
                <div className="col-span-1 md:col-span-2 bg-surface-container-low p-4 rounded-lg">
                  <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">EMPREINTE HASH (SHA-256)</span>
                  <code className="font-mono text-[13px] break-all text-on-surface">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</code>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4 flex items-center gap-2 border-b border-outline-variant pb-2">
                <Icon name="group" />
                Signataires
              </h2>
              <div className="overflow-x-auto rounded-lg border border-outline-variant">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant">
                      <th className="p-3 font-label-md text-label-md text-on-surface">Nom</th>
                      <th className="p-3 font-label-md text-label-md text-on-surface">Adresse IP</th>
                      <th className="p-3 font-label-md text-label-md text-on-surface">Horodatage</th>
                      <th className="p-3 font-label-md text-label-md text-on-surface">Méthode</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-sm text-body-sm">
                    {SIGNATORIES.map((s) => (
                      <tr key={s.name} className="border-b border-outline-variant last:border-0 hover:bg-surface-bright transition-colors">
                        <td className="p-3 font-medium text-on-surface">{s.name}</td>
                        <td className="p-3 text-on-surface-variant">{s.ip}</td>
                        <td className="p-3 text-on-surface-variant">{s.timestamp}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 bg-secondary-container text-on-secondary-container px-2 py-1 rounded font-label-sm text-label-sm">
                            <Icon name={s.icon} size={14} />
                            {s.method}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6 flex items-center gap-2 border-b border-outline-variant pb-2">
                <Icon name="history" />
                Journal d'Audit
              </h2>
              <div className="relative pl-6 border-l-2 border-outline-variant space-y-8 ml-4">
                {AUDIT_TRAIL.map((entry) => (
                  <div key={entry.time + entry.title} className="relative">
                    <div
                      className={`absolute -left-[35px] rounded-full p-1 ${
                        entry.tone === 'filled'
                          ? 'bg-primary text-on-primary shadow-sm'
                          : entry.tone === 'primary'
                            ? 'bg-surface-container-lowest border-2 border-primary text-primary'
                            : 'bg-surface-container-lowest border-2 border-outline text-on-surface-variant'
                      }`}
                    >
                      <Icon name={entry.icon} size={16} />
                    </div>
                    <div className={`font-label-sm text-label-sm mb-1 ${entry.tone === 'filled' ? 'text-primary' : 'text-on-surface-variant'}`}>{entry.time}</div>
                    <div className={`font-body-md text-body-md text-on-surface ${entry.tone === 'filled' ? 'font-bold' : 'font-medium'}`}>{entry.title}</div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant">{entry.detail}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <footer className="bg-surface-container-low p-6 border-t border-outline-variant">
            <p className="font-body-sm text-body-sm text-on-surface-variant text-center max-w-2xl mx-auto">
              Ce document constitue une preuve électronique au sens de la législation en vigueur. Les signatures électroniques apposées via la plateforme SignSecure TrustFlow bénéficient d'une présomption de fiabilité et ont la même valeur légale qu'une signature manuscrite. Toute altération de ce document annulera sa validité.
            </p>
            <div className="mt-4 text-center print:hidden">
              <button
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-fixed-dim hover:text-on-primary-fixed transition-colors"
                onClick={() => window.print()}
              >
                <Icon name="print" />
                Imprimer / PDF
              </button>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}
