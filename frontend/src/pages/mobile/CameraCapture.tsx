import { useRef, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'
import { traceObservationsUrl } from '../../routes'

/**
 * Capture des photos de référence Trace — caméra uniquement. L'import depuis
 * la galerie est volontairement absent : il permettrait de joindre une photo
 * retouchée ou prise avant la réception. Le serveur calcule l'empreinte
 * SHA-256 de chaque photo reçue et l'horodate lui-même.
 * Limite assumée : un navigateur ne peut pas prouver qu'une image vient de
 * la caméra ; cette contrainte réduit le risque, elle ne l'élimine pas.
 */
export function CameraCapture() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [photos, setPhotos] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const addPhotos = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) setPhotos((prev) => [...prev, ...files])
    e.target.value = ''
  }

  const removePhoto = (index: number) => setPhotos((prev) => prev.filter((_, i) => i !== index))

  const handleFinish = async () => {
    if (!id || photos.length === 0 || uploading) return
    setError(null)
    setUploading(true)
    const formData = new FormData()
    photos.forEach((photo) => formData.append('photos', photo))
    try {
      await apiRequest(`/trace/${id}/capture`, { method: 'POST', body: formData })
      navigate(traceObservationsUrl(id))
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-black text-white min-h-screen font-body-sm relative flex flex-col">
      <header className="w-full z-40 flex justify-between items-center px-4 py-4 bg-gradient-to-b from-black/80 to-transparent">
        <button className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm text-white hover:bg-black/60 transition-colors" onClick={() => navigate(-1)}>
          <Icon name="close" />
        </button>
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
          <Icon name="shield" filled size={16} className="text-primary-fixed-dim" />
          <span className="font-label-sm text-label-sm text-white uppercase tracking-wider">Mode Sécurisé</span>
        </div>
        <div className="bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
          <span className="font-label-sm text-label-sm text-white whitespace-nowrap">Étape 2/3 — Photos</span>
        </div>
      </header>

      <div className="flex-1 relative flex flex-col justify-center items-center px-4">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />

        <div className="relative z-10 w-[85%] max-w-md flex flex-col items-center">
          {error && (
            <div className="w-full mb-4">
              <FormAlert tone="error">{error}</FormAlert>
            </div>
          )}
          {photos.length === 0 ? (
            <>
              <div className="relative w-full aspect-[3/4] border border-white/20 rounded-xl overflow-hidden flex items-center justify-center text-white/40">
                <Icon name="document_scanner" size={48} />
                {Object.entries({
                  tl: 'top-0 left-0 border-r-0 border-b-0 rounded-tl-xl',
                  tr: 'top-0 right-0 border-l-0 border-b-0 rounded-tr-xl',
                  bl: 'bottom-0 left-0 border-r-0 border-t-0 rounded-bl-xl',
                  br: 'bottom-0 right-0 border-l-0 border-t-0 rounded-br-xl',
                }).map(([corner, pos]) => (
                  <span key={corner} className={`absolute w-10 h-10 border-[3px] border-primary-fixed-dim ${pos}`} />
                ))}
              </div>
              <div className="mt-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                <Icon name="camera_alt" size={18} className="text-primary-fixed-dim" />
                <span className="font-label-md text-label-md text-white">Photographiez chaque page du document</span>
              </div>
              <p className="mt-3 font-label-sm text-label-sm text-white/60 text-center">
                Une photo par page est exigée avant validation. L'heure retenue est celle du serveur à la réception.
              </p>
            </>
          ) : (
            <p className="font-label-md text-label-md text-white/70 text-center mb-2">
              {photos.length} page{photos.length > 1 ? 's' : ''} capturée{photos.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      <div className="w-full z-30 bg-gradient-to-t from-black via-black/90 to-transparent pb-8 pt-12 px-4 flex flex-col gap-6">
        {photos.length > 0 && (
          <div className="w-full overflow-x-auto flex gap-3 px-2 pb-2">
            {photos.map((photo, i) => (
              <div key={`${photo.name}-${i}`} className="relative w-16 h-20 bg-white rounded-md shrink-0 border-2 border-primary-fixed-dim overflow-hidden shadow-lg">
                <img src={URL.createObjectURL(photo)} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 right-0 bg-primary-fixed-dim text-on-primary-fixed w-5 h-5 flex items-center justify-center rounded-tl-md font-label-sm text-[10px]">
                  {i + 1}
                </div>
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center"
                  aria-label="Retirer cette page"
                >
                  <Icon name="close" size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center w-full max-w-sm mx-auto">
          <div className="flex flex-col items-center gap-1 opacity-70 p-2 w-16 text-center">
            <Icon name="no_photography" />
            <span className="font-label-sm text-[10px] text-white leading-tight">Galerie désactivée</span>
          </div>
          <button
            className="relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center group active:scale-95 transition-transform duration-150"
            onClick={() => cameraInputRef.current?.click()}
            type="button"
          >
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center group-hover:bg-primary-fixed-dim transition-colors duration-300">
              <div className="w-14 h-14 rounded-full border-2 border-black/10" />
            </div>
          </button>
          <button
            className="flex flex-col items-center gap-1 p-2 bg-primary-container text-on-primary-container rounded-lg px-4 py-2 font-label-md text-label-md disabled:opacity-50"
            onClick={handleFinish}
            disabled={photos.length === 0 || uploading}
            type="button"
          >
            {uploading ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />
            ) : (
              <>
                Terminer
                <span className="font-label-sm text-[10px] opacity-80">
                  ({photos.length} page{photos.length !== 1 ? 's' : ''})
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={addPhotos} />
    </div>
  )
}
