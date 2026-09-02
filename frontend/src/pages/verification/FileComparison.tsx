import { useNavigate } from 'react-router-dom'
import { useState, type DragEvent } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Icon } from '../../components/ui/Icon'

export function FileComparison() {
  const navigate = useNavigate()
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) setFileName(file.name)
  }

  return (
    <AppShell active="verify">
      <div className="flex items-center gap-2 mb-2">
        <button className="p-2 rounded-full hover:bg-surface-variant transition-colors text-on-surface-variant lg:hidden" onClick={() => navigate(-1)}>
          <Icon name="arrow_back" />
        </button>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Vérification par fichier</h1>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mb-8">
        Comparez le document soumis avec la référence originale enregistrée sur la plateforme. Téléversez le fichier suspecté pour lancer l'analyse structurelle et cryptographique.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_1px_3px_rgba(15,23,42,0.1)] border border-outline-variant/30 flex flex-col gap-6">
          <div className="flex items-center gap-4 pb-4 border-b border-outline-variant/30">
            <div className="w-12 h-12 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
              <Icon name="description" size={28} />
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Document de Référence</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#e6f4ea] text-[#1e8e3e]">
                  <Icon name="check_circle" size={14} className="mr-1" />
                  Validé
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">ID: 8F4A-99B2</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-label-md text-label-md text-on-surface-variant">Nom du fichier</span>
              <span className="font-body-md text-body-md font-medium text-on-surface truncate max-w-[200px]">Contrat_Partenariat_Final.pdf</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-label-md text-label-md text-on-surface-variant">Signataire</span>
              <span className="font-body-md text-body-md font-medium text-on-surface">Jean Dupont (Directeur)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-label-md text-label-md text-on-surface-variant">Date d'enregistrement</span>
              <span className="font-body-md text-body-md font-medium text-on-surface flex items-center gap-1">
                <Icon name="calendar_today" size={16} />
                12 Oct 2023, 14:30
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-label-md text-label-md text-on-surface-variant">Empreinte (SHA-256)</span>
              <span className="font-body-sm text-body-sm font-mono text-secondary truncate max-w-[150px] bg-surface-variant px-2 py-1 rounded">
                e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
              </span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_1px_3px_rgba(15,23,42,0.1)] border border-outline-variant/30 flex flex-col h-full">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Fichier à comparer</h2>
          <div
            className={`flex-grow flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer relative group min-h-[250px] ${
              dragActive ? 'border-primary bg-primary-container/10' : 'border-outline-variant bg-surface hover:bg-surface-container-high'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <input
              accept=".pdf"
              aria-label="Téléverser un fichier PDF pour comparaison"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              type="file"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
            <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
              <Icon name="upload_file" size={28} />
            </div>
            <p className="font-headline-sm text-headline-sm text-on-surface mb-2">{fileName ?? 'Glissez-déposez le PDF ici'}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">ou cliquez pour parcourir</p>
            <button className="bg-surface-container-lowest border border-outline text-on-surface font-label-md py-2 px-4 rounded-lg shadow-sm" type="button">
              Sélectionner un fichier
            </button>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-4 opacity-70">Format supporté: PDF. Taille max: 10 Mo.</p>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
