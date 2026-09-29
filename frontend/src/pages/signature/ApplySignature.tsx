import { useRef, useState, type ChangeEvent, type PointerEvent } from 'react'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { PdfViewer } from '../../components/ui/PdfViewer'
import { Stepper } from '../../components/ui/Stepper'
import { EXTERNAL_SIGNER_STEPS } from '../../constants/steps'
import { forgetRememberedSignature, getRememberedSignature, rememberSignature } from '../../lib/signatureMemory'

type SignatureTab = 'dessiner' | 'importer' | 'enregistree'

interface ApplySignatureProps {
  documentTitle: string
  /** URL publique (endpoint /sign/link/:token/fichier) du PDF réel à afficher — null tant qu'il n'est pas encore chargé. */
  pdfUrl: string | null
  /** Envoie consentement + image au serveur — l'appelant ne doit jamais garder cette image en mémoire au-delà de cet appel (CLAUDE.md § Sign). */
  onSubmit: (consentement: true, signatureImageBase64: string) => Promise<void>
  submitting: boolean
  error: string | null
}

/**
 * Étape "dessiner ma signature" du parcours signataire. Composant purement
 * présentationnel : c'est SignerInvite qui pilote l'appel réseau et détruit
 * l'image côté serveur immédiatement après envoi — jamais stockée ni mise en
 * cache serveur au-delà du traitement de cette signature précise.
 *
 * Exception délibérée, uniquement côté client : le dernier dessin est gardé
 * en mémoire d'onglet (signatureMemory.ts, jamais écrit sur disque, jamais
 * transmis avant validation d'une signature précise) pour éviter de
 * redessiner à l'identique en cas de signatures multiples dans la même
 * session — accessible via l'onglet "Enregistrée" ci-dessous.
 */
export function ApplySignature({ documentTitle, pdfUrl, onSubmit, submitting, error }: ApplySignatureProps) {
  const [tab, setTab] = useState<SignatureTab>('dessiner')
  const [legalCheck, setLegalCheck] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [importedImage, setImportedImage] = useState<string | null>(null)
  const [rememberedImage, setRememberedImage] = useState<string | null>(() => getRememberedSignature())
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const drawing = useRef(false)

  const getContext = () => canvasRef.current?.getContext('2d') ?? null

  const startDraw = (e: PointerEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current
    const ctx = getContext()
    if (!canvas || !ctx) return
    drawing.current = true
    const rect = canvas.getBoundingClientRect()
    ctx.strokeStyle = '#005c55'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const draw = (e: PointerEvent<HTMLDivElement>) => {
    if (!drawing.current) return
    const canvas = canvasRef.current
    const ctx = getContext()
    if (!canvas || !ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
    setHasSignature(true)
  }

  const endDraw = () => {
    drawing.current = false
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = getContext()
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImportedImage(typeof reader.result === 'string' ? reader.result : null)
    reader.readAsDataURL(file)
  }

  const hasUsableSignature =
    (tab === 'dessiner' && hasSignature) || (tab === 'importer' && Boolean(importedImage)) || (tab === 'enregistree' && Boolean(rememberedImage))
  const canConfirm = legalCheck && hasUsableSignature && !submitting

  const handleConfirm = async () => {
    if (!canConfirm) return
    const image = tab === 'dessiner' ? canvasRef.current?.toDataURL('image/png') : tab === 'importer' ? importedImage : rememberedImage
    if (!image) return
    await onSubmit(true, image)
    // Sécurité (CLAUDE.md) : rien ne doit rester en mémoire côté serveur une
    // fois envoyé. Côté client, on garde volontairement ce dessin en mémoire
    // d'onglet (signatureMemory.ts) pour une éventuelle prochaine signature
    // dans la même session — voir le commentaire en tête de fichier.
    rememberSignature(image)
    setRememberedImage(image)
    clearCanvas()
    setImportedImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const clearRememberedSignature = () => {
    forgetRememberedSignature()
    setRememberedImage(null)
  }

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
      <header className="bg-surface-container-lowest shadow-sm w-full h-16 px-gutter flex justify-between items-center z-40 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <Icon name="shield" className="text-primary" />
          <span className="font-headline-sm text-headline-sm font-black text-primary">SignSecure TrustFlow</span>
          <div className="h-6 w-px bg-outline-variant mx-2 hidden sm:block" />
          <span className="font-label-md text-label-md text-on-surface-variant hidden sm:block truncate">{documentTitle}</span>
        </div>
      </header>

      <div className="shrink-0 border-b border-outline-variant bg-surface-container-lowest px-gutter py-3">
        <div className="max-w-xs mx-auto">
          <Stepper steps={EXTERNAL_SIGNER_STEPS} currentStep={0} />
        </div>
      </div>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <div className="flex-1 bg-surface-container-low p-4 md:p-8 flex justify-center overflow-hidden">
          <div className="w-full max-w-4xl h-full bg-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.1)] rounded-lg flex flex-col relative overflow-hidden">
            <div className="h-12 border-b border-outline-variant flex items-center px-6 justify-between bg-surface-container-lowest shrink-0">
              <span className="font-label-md text-label-md text-on-surface">{documentTitle}</span>
              <div className="flex gap-2 text-on-surface-variant items-center">
                <Icon name="zoom_out" size={20} className="cursor-pointer hover:text-primary" />
                <span className="font-label-md text-label-md w-12 text-center">100%</span>
                <Icon name="zoom_in" size={20} className="cursor-pointer hover:text-primary" />
              </div>
            </div>
            <div className="flex-1 overflow-hidden relative flex flex-col">
              {pdfUrl ? (
                <PdfViewer url={pdfUrl} className="flex-1 w-full p-4" />
              ) : (
                <div className="flex-1 flex items-center justify-center text-on-surface-variant gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-outline-variant border-t-primary animate-spin" aria-hidden="true" />
                  Chargement du document…
                </div>
              )}
              <div className="shrink-0 border-t border-outline-variant bg-surface-container-lowest px-6 py-3 flex items-center justify-between gap-3">
                <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <Icon name="info" size={14} />
                  La zone et la mise en page exactes de votre signature sont calculées côté serveur au moment de la validation.
                </p>
                <span
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-label-sm text-label-sm border ${
                    hasUsableSignature ? 'bg-yellow-50 border-yellow-400 text-yellow-800' : 'bg-surface border-outline-variant text-on-surface-variant'
                  }`}
                >
                  <Icon name={hasUsableSignature ? 'check_circle' : 'draw'} filled={hasUsableSignature} size={16} />
                  {hasUsableSignature ? 'Signature prête à être envoyée' : 'Signature pas encore fournie'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[420px] bg-surface-container-lowest border-t lg:border-t-0 lg:border-l border-outline-variant flex flex-col shadow-[0_-4px_15px_-3px_rgba(15,23,42,0.1)] lg:shadow-[-4px_0_15px_-3px_rgba(15,23,42,0.1)] z-10 shrink-0 lg:h-auto">
          <div className="p-6 border-b border-outline-variant bg-surface-bright">
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Signature requise</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Veuillez fournir votre signature pour valider le document.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            {error && <FormAlert tone="error">{error}</FormAlert>}

            <div className="flex border-b border-outline-variant">
              {(
                [
                  ['dessiner', 'Dessiner'],
                  ['importer', 'Importer'],
                  ['enregistree', 'Enregistrée'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 pb-3 text-center font-label-md text-label-md ${
                    tab === key ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'dessiner' && (
              <div
                className="relative w-full h-[200px] bg-surface rounded border border-outline-variant flex items-center justify-center cursor-crosshair"
                onPointerDown={startDraw}
                onPointerMove={draw}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
              >
                {!hasSignature && <span className="absolute text-surface-variant font-display text-display opacity-30 select-none pointer-events-none">Signez ici</span>}
                <canvas ref={canvasRef} width={360} height={200} className="absolute inset-0 w-full h-full" />
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="absolute top-2 right-2 text-on-surface-variant hover:text-error text-sm flex items-center gap-1 bg-white/80 px-2 py-1 rounded shadow-sm"
                >
                  <Icon name="delete" size={16} />
                </button>
              </div>
            )}
            {tab === 'importer' && (
              <div className="relative w-full h-[200px] bg-surface rounded border-2 border-dashed border-outline-variant flex flex-col items-center justify-center gap-2 text-on-surface-variant overflow-hidden">
                {importedImage ? (
                  <>
                    <img src={importedImage} alt="Signature importée" className="max-h-full max-w-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setImportedImage(null)}
                      className="absolute top-2 right-2 text-on-surface-variant hover:text-error text-sm flex items-center gap-1 bg-white/80 px-2 py-1 rounded shadow-sm"
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2">
                    <Icon name="upload_file" size={28} />
                    <span className="font-body-sm text-body-sm">Importer une image de signature (PNG, JPG)</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFileChange} />
              </div>
            )}
            {tab === 'enregistree' &&
              (rememberedImage ? (
                <div className="relative w-full h-[200px] bg-surface rounded border border-outline-variant flex items-center justify-center overflow-hidden">
                  <img src={rememberedImage} alt="Dernière signature utilisée dans cette session" className="max-h-full max-w-full object-contain" />
                  <button
                    type="button"
                    onClick={clearRememberedSignature}
                    className="absolute top-2 right-2 text-on-surface-variant hover:text-error text-sm flex items-center gap-1 bg-white/80 px-2 py-1 rounded shadow-sm"
                    title="Oublier cette signature et en redessiner une nouvelle"
                  >
                    <Icon name="delete" size={16} />
                  </button>
                </div>
              ) : (
                <div className="w-full h-[200px] bg-surface rounded border border-outline-variant flex flex-col items-center justify-center gap-2 text-on-surface-variant text-center px-6">
                  <Icon name="history" size={28} />
                  <span className="font-body-sm text-body-sm">
                    Aucune signature à réutiliser pour l'instant — elle apparaîtra ici après votre première signature dans cette session.
                  </span>
                </div>
              ))}
            {tab === 'enregistree' && rememberedImage && (
              <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                <Icon name="info" size={14} />
                Conservée uniquement dans cet onglet, le temps de la session — jamais sur nos serveurs.
              </p>
            )}

            <div className="flex items-start gap-3 mt-auto pt-4">
              <div className="flex items-center h-5">
                <input
                  className="w-5 h-5 text-primary border-outline rounded focus:ring-primary focus:ring-2 cursor-pointer bg-surface-container-lowest"
                  id="legal-check"
                  type="checkbox"
                  checked={legalCheck}
                  onChange={(e) => setLegalCheck(e.target.checked)}
                />
              </div>
              <label className="font-body-sm text-body-sm text-on-surface cursor-pointer select-none" htmlFor="legal-check">
                Je confirme vouloir apposer ma signature électronique sur ce document et m'engager sur les termes qui y sont stipulés.
              </label>
            </div>
          </div>
          <div className="p-6 bg-surface-bright border-t border-outline-variant">
            <button
              className={`w-full font-label-md text-label-md py-3 px-4 rounded flex items-center justify-center gap-2 transition-colors ${
                canConfirm ? 'bg-primary text-on-primary hover:bg-primary-fixed-dim cursor-pointer' : 'bg-surface-variant text-on-surface-variant cursor-not-allowed'
              }`}
              disabled={!canConfirm}
              onClick={handleConfirm}
              type="button"
            >
              {submitting ? (
                <span className="w-4 h-4 rounded-full border-2 border-on-surface-variant/40 border-t-on-surface-variant animate-spin" aria-hidden="true" />
              ) : (
                <Icon name="check_circle" />
              )}
              {submitting ? 'Envoi…' : 'Confirmer la signature'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
