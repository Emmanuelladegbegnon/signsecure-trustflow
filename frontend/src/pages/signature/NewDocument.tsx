import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { Stepper } from '../../components/ui/Stepper'
import { DOCUMENT_TYPES, isExcludedFromDigital } from '../../constants/documentTypes'
import { SIGN_STEPS } from '../../constants/steps'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'
import { assignSignersUrl } from '../../routes'

const MAX_SIZE_BYTES = 10 * 1024 * 1024

interface CreateDocumentResponse {
  dossierId: string
  trackingCode: string
}

export function NewDocument() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [titre, setTitre] = useState('')
  const [type, setType] = useState('')
  const [sensible, setSensible] = useState(false)
  const [art267Ack, setArt267Ack] = useState(false)
  const excluded = isExcludedFromDigital(type)
  const [dragActive, setDragActive] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ file?: string; titre?: string; type?: string; art267?: string }>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const acceptFile = (candidate: File | undefined) => {
    if (!candidate) return
    if (candidate.type !== 'application/pdf') {
      setFieldErrors((prev) => ({ ...prev, file: 'Seuls les fichiers PDF sont acceptés.' }))
      return
    }
    if (candidate.size > MAX_SIZE_BYTES) {
      setFieldErrors((prev) => ({ ...prev, file: 'Le fichier dépasse la taille maximale de 10 Mo.' }))
      return
    }
    setFieldErrors((prev) => ({ ...prev, file: undefined }))
    setFile(candidate)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    acceptFile(e.dataTransfer.files?.[0])
  }

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => acceptFile(e.target.files?.[0])

  const validate = () => {
    const errors: typeof fieldErrors = {}
    if (!file) errors.file = 'Sélectionnez un fichier PDF.'
    if (!titre.trim()) errors.titre = 'Le titre du dossier est requis.'
    if (!type) errors.type = 'Sélectionnez un type de document.'
    if (excluded && !art267Ack) errors.art267 = 'Confirmez avoir pris connaissance de la restriction légale avant de continuer.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setApiError(null)
    if (!validate() || !file) return

    const formData = new FormData()
    formData.append('fichier', file)
    formData.append('titre', titre.trim())
    formData.append('type', type)
    formData.append('sensible', String(sensible))

    setSubmitting(true)
    try {
      const { dossierId } = await apiRequest<CreateDocumentResponse>('/documents', { method: 'POST', body: formData })
      navigate(assignSignersUrl(dossierId))
    } catch (err) {
      setApiError(err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell active="sign">
      <div className="mb-8">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Nouveau Document</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Préparez un document pour signature électronique sécurisée.</p>
      </div>

      <div className="mb-12">
        <Stepper steps={SIGN_STEPS} currentStep={0} />
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-6 md:p-8 max-w-3xl mx-auto">
        {apiError && (
          <div className="mb-6">
            <FormAlert tone="error">{apiError}</FormAlert>
          </div>
        )}

        <div
          className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer mb-2 group ${
            dragActive ? 'border-primary bg-surface-container-low' : 'border-outline-variant hover:border-primary hover:bg-surface-container-low bg-surface'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileInput} />
          <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4 group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">
            <Icon name={file ? 'picture_as_pdf' : 'upload_file'} filled className="text-3xl text-on-surface-variant group-hover:text-on-primary-container" />
          </div>
          {file ? (
            <>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2 break-all">{file.name}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">{(file.size / (1024 * 1024)).toFixed(1)} Mo</p>
            </>
          ) : (
            <>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Glissez-déposez votre PDF ici</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">ou cliquez pour parcourir vos fichiers (Max 10MB)</p>
            </>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
            className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full font-label-md text-label-md hover:bg-secondary-fixed transition-colors shadow-sm"
          >
            {file ? 'Changer de fichier' : 'Sélectionner un fichier'}
          </button>
        </div>
        {fieldErrors.file && (
          <p className="font-label-sm text-label-sm text-error flex items-center gap-1 mb-6">
            <Icon name="error" size={14} />
            {fieldErrors.file}
          </p>
        )}
        {!fieldErrors.file && <div className="mb-8" />}

        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1" htmlFor="titre-dossier">
              Titre du dossier
            </label>
            <input
              className={`w-full bg-surface border rounded-lg px-4 py-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-shadow font-body-md text-body-md placeholder:text-on-surface-variant/50 ${
                fieldErrors.titre ? 'border-error' : 'border-outline-variant'
              }`}
              id="titre-dossier"
              name="titre-dossier"
              placeholder="Ex: Contrat de prestation - Client X"
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
            />
            {fieldErrors.titre && (
              <p className="font-label-sm text-label-sm text-error flex items-center gap-1 mt-1">
                <Icon name="error" size={14} />
                {fieldErrors.titre}
              </p>
            )}
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1" htmlFor="type-document">
              Type de document
            </label>
            <div className="relative">
              <select
                className={`appearance-none w-full bg-surface border rounded-lg px-4 py-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-shadow font-body-md text-body-md pr-10 ${
                  fieldErrors.type ? 'border-error' : 'border-outline-variant'
                }`}
                id="type-document"
                name="type-document"
                value={type}
                onChange={(e) => {
                  setType(e.target.value)
                  setArt267Ack(false)
                }}
              >
                <option value="">Sélectionnez un type</option>
                {DOCUMENT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-on-surface-variant">
                <Icon name="expand_more" />
              </div>
            </div>
            {fieldErrors.type && (
              <p className="font-label-sm text-label-sm text-error flex items-center gap-1 mt-1">
                <Icon name="error" size={14} />
                {fieldErrors.type}
              </p>
            )}
          </div>
          {excluded && (
            <div className="rounded-lg border border-error/40 bg-error-container/30 p-4 flex flex-col gap-3">
              <p className="font-body-sm text-body-sm text-on-surface flex items-start gap-2">
                <Icon name="gavel" size={18} className="text-error shrink-0 mt-0.5" />
                <span>
                  <strong>Attention — art. 267 du Code du numérique :</strong> les actes relevant du droit de la famille, des successions, et les
                  actes de sûreté (sauf s'ils sont passés pour les besoins d'une profession) sont exclus de la forme électronique. Une version
                  signée dans SignSecure pourrait ne pas être recevable. Pour ces actes, privilégiez la signature papier, puis enregistrez-la
                  dans Trace.
                </span>
              </p>
              <label className="flex items-start gap-2 font-body-sm text-body-sm text-on-surface cursor-pointer">
                <input type="checkbox" className="mt-1" checked={art267Ack} onChange={(e) => setArt267Ack(e.target.checked)} />
                J'ai pris connaissance de cette restriction ; ce document relève d'un usage professionnel ou d'une exception admise.
              </label>
              {fieldErrors.art267 && (
                <p className="font-label-sm text-label-sm text-error flex items-center gap-1">
                  <Icon name="error" size={14} />
                  {fieldErrors.art267}
                </p>
              )}
            </div>
          )}

          <label className="flex items-start gap-3 rounded-lg border border-outline-variant p-4 cursor-pointer hover:bg-surface-container-low transition-colors">
            <input type="checkbox" className="mt-1" checked={sensible} onChange={(e) => setSensible(e.target.checked)} />
            <span className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface">Document sensible — double code de validation</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Chaque signataire devra saisir deux codes, l'un reçu par SMS et l'autre par email. Cela réduit le risque qu'une seule ligne
                téléphonique détournée (SIM swap) suffise à signer.
              </span>
            </span>
          </label>

          <div className="pt-6 border-t border-outline-variant flex justify-end">
            <button
              className="bg-primary text-on-primary px-8 py-3 rounded-lg font-label-md text-label-md flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              type="submit"
              disabled={submitting}
            >
              {submitting && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />}
              {submitting ? 'Envoi…' : 'Suivant'}
              {!submitting && <Icon name="arrow_forward" size={18} />}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
