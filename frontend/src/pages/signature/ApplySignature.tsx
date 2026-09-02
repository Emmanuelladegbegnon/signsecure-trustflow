import { useRef, useState, type PointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { ROUTES } from '../../routes'

type SignatureTab = 'dessiner' | 'importer' | 'enregistree'

export function ApplySignature() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<SignatureTab>('dessiner')
  const [legalCheck, setLegalCheck] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
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
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const canConfirm = legalCheck && (tab !== 'dessiner' || hasSignature)

  return (
    <div className="bg-background text-on-background font-body-md h-screen flex flex-col overflow-hidden">
      <header className="bg-surface-container-lowest shadow-sm w-full h-16 px-gutter flex justify-between items-center z-40 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button aria-label="Retour" className="text-on-surface-variant hover:text-primary transition-all p-2 rounded-full hover:bg-surface-container-high" onClick={() => navigate(-1)}>
            <Icon name="close" />
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <Icon name="shield" className="text-primary" />
            <span className="font-headline-sm text-headline-sm font-black text-primary">SignSecure TrustFlow</span>
          </div>
          <div className="h-6 w-px bg-outline-variant mx-2 hidden sm:block" />
          <span className="font-label-md text-label-md text-on-surface-variant hidden sm:block truncate">Contrat de Prestation - Ref: CT-2023-089</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-primary font-label-md text-label-md hover:bg-surface-container-high px-4 py-2 rounded transition-colors hidden sm:block">Démonstration</button>
          <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-label-md text-label-md font-bold">AK</div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <div className="flex-1 bg-surface-container-low p-4 md:p-8 flex justify-center overflow-hidden">
          <div className="w-full max-w-4xl h-full bg-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.1)] rounded-lg flex flex-col relative overflow-hidden">
            <div className="h-12 border-b border-outline-variant flex items-center px-6 justify-between bg-surface-container-lowest shrink-0">
              <span className="font-label-md text-label-md text-on-surface">Page 5 sur 5</span>
              <div className="flex gap-2 text-on-surface-variant items-center">
                <Icon name="zoom_out" size={20} className="cursor-pointer hover:text-primary" />
                <span className="font-label-md text-label-md w-12 text-center">100%</span>
                <Icon name="zoom_in" size={20} className="cursor-pointer hover:text-primary" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 relative">
              <div className="space-y-6 text-on-surface-variant font-body-sm mb-12 opacity-70">
                <div className="h-4 bg-surface-container-high rounded w-3/4" />
                <div className="h-4 bg-surface-container-high rounded w-full" />
                <div className="h-4 bg-surface-container-high rounded w-5/6" />
                <div className="h-4 bg-surface-container-high rounded w-full" />
                <br />
                <div className="h-4 bg-surface-container-high rounded w-2/3" />
                <div className="h-4 bg-surface-container-high rounded w-full" />
                <div className="h-4 bg-surface-container-high rounded w-4/5" />
              </div>
              <p className="font-body-md text-body-md text-on-surface mb-8">Fait à Dakar, le 24 Octobre 2023.</p>
              <div className="flex justify-between mt-12">
                <div className="w-1/2">
                  <p className="font-label-md text-label-md text-on-surface mb-2">Le Prestataire</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Jean Dupont</p>
                </div>
                <div className="w-1/2">
                  <p className="font-label-md text-label-md text-on-surface mb-2">Le Client</p>
                  <div className="relative w-full max-w-[280px] h-[120px] bg-yellow-50 border-2 border-dashed border-yellow-400 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-100 transition-colors group">
                    <div className="absolute -top-3 -right-3 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm">
                      <Icon name="edit" size={16} className="text-yellow-900" />
                    </div>
                    {hasSignature ? (
                      <Icon name="check_circle" filled className="text-yellow-700" />
                    ) : (
                      <Icon name="draw" className="text-yellow-600 mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                    )}
                    <span className="font-label-md text-label-md text-yellow-800 text-center px-4">
                      {hasSignature ? 'Signature apposée' : 'Cliquez pour apposer votre signature ici'}
                    </span>
                  </div>
                </div>
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
              <div className="w-full h-[200px] bg-surface rounded border-2 border-dashed border-outline-variant flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                <Icon name="upload_file" size={28} />
                <span className="font-body-sm text-body-sm">Importer une image de signature (PNG, JPG)</span>
              </div>
            )}
            {tab === 'enregistree' && (
              <div className="w-full h-[200px] bg-surface rounded border border-outline-variant flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                <Icon name="history" size={28} />
                <span className="font-body-sm text-body-sm">Aucune signature enregistrée pour ce compte</span>
              </div>
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
              onClick={() => navigate(ROUTES.signatureOtp)}
            >
              <Icon name="check_circle" />
              Confirmer la signature
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
