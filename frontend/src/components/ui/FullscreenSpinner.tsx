export function FullscreenSpinner() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background" role="status" aria-live="polite">
      <div className="w-10 h-10 rounded-full border-4 border-outline-variant border-t-primary animate-spin" />
      <span className="sr-only">Chargement…</span>
    </div>
  )
}
