import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
// Import Vite du fichier worker pdf.js en tant qu'URL statique — nécessaire
// pour que le rendu (décodage + rasterisation) tourne hors du thread
// principal, comme le recommande pdf.js.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Icon } from './Icon'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

interface PdfViewerProps {
  /** URL du PDF (objet blob local ou endpoint authentifié déjà résolu) — null tant qu'il n'est pas encore chargé. */
  url: string | null
  className?: string
}

/**
 * Rendu du PDF directement sur `<canvas>` via pdf.js, plutôt qu'un
 * `<iframe src={pdfUrl}>` : ce dernier délègue au lecteur PDF natif du
 * navigateur (barre d'outils imprimer/télécharger, marges grises) qui donne
 * l'impression d'une capture d'aperçu avant impression plutôt que d'un
 * document ouvert dans l'application. Ici, on contrôle entièrement le rendu
 * — juste les pages, mises à la largeur du conteneur, sans chrome de
 * navigateur autour.
 */
export function PdfViewer({ url, className }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url) return
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    setLoading(true)
    setError(null)
    container.replaceChildren()

    const loadingTask = pdfjsLib.getDocument({ url })

    loadingTask.promise
      .then(async (pdf) => {
        const containerWidth = container.clientWidth || 800
        const devicePixelRatio = window.devicePixelRatio || 1

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          if (cancelled) return
          const page = await pdf.getPage(pageNumber)
          // Mise à l'échelle pour occuper toute la largeur disponible, comme
          // le ferait un lecteur PDF natif d'application plutôt qu'une
          // fenêtre de taille fixe.
          const unscaledViewport = page.getViewport({ scale: 1 })
          const scale = containerWidth / unscaledViewport.width
          const viewport = page.getViewport({ scale: scale * devicePixelRatio })

          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.width = '100%'
          canvas.style.height = 'auto'
          canvas.style.display = 'block'
          canvas.className = 'bg-white shadow-sm mb-3 last:mb-0'
          container.appendChild(canvas)

          const ctx = canvas.getContext('2d')
          if (!ctx || cancelled) continue
          await page.render({ canvasContext: ctx, viewport, canvas }).promise
        }
        if (!cancelled) setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error(err)
        setError("Impossible d'afficher l'aperçu du document.")
        setLoading(false)
      })

    return () => {
      cancelled = true
      loadingTask.destroy()
    }
  }, [url])

  return (
    <div className={`overflow-y-auto ${className ?? ''}`}>
      {loading && !error && (
        <div className="w-full h-full min-h-[200px] flex items-center justify-center text-on-surface-variant gap-2">
          <span className="w-4 h-4 rounded-full border-2 border-outline-variant border-t-primary animate-spin" aria-hidden="true" />
          Chargement du document…
        </div>
      )}
      {error && (
        <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-2 text-on-surface-variant text-center px-6">
          <Icon name="error" size={28} />
          <span className="font-body-sm text-body-sm">{error}</span>
        </div>
      )}
      <div ref={containerRef} className={loading || error ? 'hidden' : ''} />
    </div>
  )
}
