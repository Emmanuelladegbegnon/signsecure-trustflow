import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { AppShell } from '../../components/layout/AppShell'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError, fetchAuthedFileUrl } from '../../lib/httpClient'

interface PendingCheck {
  signataireId: string
  nomDeclare: string
  document: { id: string; titre: string; code: string | null }
  emetteurId: string
  emetteur: string
  typePieceLibelle: string
  soumisLe: string
  verso: boolean
  supprimeLe: string | null
}

/**
 * Contrôle des pièces d'identité des signataires, par un Vérificateur ou un
 * Superviseur (jamais l'émetteur du dossier). Contrôle visuel humain : le nom
 * correspond-il au nom déclaré, la pièce paraît-elle authentique et valide ?
 * Chaque consultation et chaque décision sont inscrites au journal ; la photo
 * est supprimée dès la décision.
 */
export function IdentityReview() {
  const { user } = useAuth()
  const [items, setItems] = useState<PendingCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<PendingCheck | null>(null)
  const [images, setImages] = useState<{ recto?: string; verso?: string }>({})
  const [nomConforme, setNomConforme] = useState(false)
  const [pieceValide, setPieceValide] = useState(false)
  const [motif, setMotif] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  const load = () =>
    apiRequest<{ controles: PendingCheck[] }>('/identites')
      .then((res) => setItems(res.controles))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Chargement impossible.'))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!selected) return
    const urls: string[] = []
    setImages({})
    setNomConforme(false)
    setPieceValide(false)
    setMotif('')
    const faces = selected.verso ? (['recto', 'verso'] as const) : (['recto'] as const)
    Promise.all(
      faces.map(async (face) => {
        const url = await fetchAuthedFileUrl(`/identites/${selected.signataireId}/piece/${face}`)
        urls.push(url)
        return [face, url] as const
      }),
    )
      .then((entries) => setImages(Object.fromEntries(entries)))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Pièce indisponible.'))
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [selected])

  const decide = async (decision: 'VALIDEE' | 'REFUSEE') => {
    if (!selected) return
    setSubmitting(true)
    setError(null)
    try {
      // Action sensible : la fenêtre de reconfirmation s'ouvre si nécessaire (voir ReauthDialog).
      await apiRequest(`/identites/${selected.signataireId}/decision`, {
        method: 'POST',
        body: { decision, nomConforme, ...(decision === 'REFUSEE' ? { motif: motif.trim() } : {}) },
      })
      setInfo(
        decision === 'VALIDEE'
          ? `Identité de ${selected.nomDeclare} validée. Le signataire est prévenu par email ; la photo est supprimée.`
          : `Pièce refusée. ${selected.nomDeclare} est prévenu(e) du motif ; la photo est supprimée.`,
      )
      setSelected(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Décision impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  const isIssuer = selected?.emetteurId === user?.id

  return (
    <AppShell active="identity">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Contrôle des pièces d'identité</h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
          Comparez la pièce au nom déclaré par l'émetteur. Contrôle visuel, sans reconnaissance faciale ; la photo est supprimée dès votre
          décision, seule son empreinte est conservée au journal.
        </p>
      </div>
      {info && (
        <div className="mb-4">
          <FormAlert tone="success">{info}</FormAlert>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <FormAlert tone="error">{error}</FormAlert>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex flex-col gap-2">
          <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">En attente ({items.length})</h2>
          {loading && <p className="font-body-sm text-body-sm text-on-surface-variant">Chargement…</p>}
          {!loading && items.length === 0 && <p className="font-body-sm text-body-sm text-on-surface-variant">Aucune pièce à contrôler.</p>}
          {items.map((item) => (
            <button
              key={item.signataireId}
              type="button"
              onClick={() => setSelected(item)}
              className={`text-left rounded-lg border p-3 transition-colors ${selected?.signataireId === item.signataireId ? 'border-primary bg-primary-container/10' : 'border-outline-variant hover:bg-surface-container-low'}`}
            >
              <div className="font-label-md text-label-md text-on-surface">{item.nomDeclare}</div>
              <div className="font-body-sm text-body-sm text-on-surface-variant">{item.document.titre}</div>
              <div className="font-label-sm text-label-sm text-on-surface-variant">
                {item.typePieceLibelle} · reçue le {new Date(item.soumisLe).toLocaleDateString('fr-FR')}
              </div>
            </button>
          ))}
        </div>

        {selected ? (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-container-low rounded-lg p-4">
                <span className="font-label-sm text-label-sm text-on-surface-variant block">NOM DÉCLARÉ PAR L'ÉMETTEUR</span>
                <span className="font-headline-sm text-headline-sm text-on-surface">{selected.nomDeclare}</span>
              </div>
              <div className="bg-surface-container-low rounded-lg p-4">
                <span className="font-label-sm text-label-sm text-on-surface-variant block">DOCUMENT</span>
                <span className="font-body-md text-body-md text-on-surface">{selected.document.titre}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant block">Émis par {selected.emetteur}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['recto', 'verso'] as const)
                .filter((face) => face === 'recto' || selected.verso)
                .map((face) => (
                  <figure key={face} className="flex flex-col gap-1">
                    <figcaption className="font-label-sm text-label-sm text-on-surface-variant uppercase">{face}</figcaption>
                    <div className="aspect-[3/2] rounded-lg border border-outline-variant bg-surface-container-low overflow-hidden flex items-center justify-center">
                      {images[face] ? <img src={images[face]} alt={`Pièce d'identité, ${face}`} className="w-full h-full object-contain" /> : <Icon name="image" />}
                    </div>
                  </figure>
                ))}
            </div>

            {isIssuer && (
              <FormAlert tone="info">Vous avez émis ce dossier : un autre vérificateur doit contrôler l'identité de ses signataires.</FormAlert>
            )}

            <div className="flex flex-col gap-2 font-body-md text-body-md">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={nomConforme} onChange={(e) => setNomConforme(e.target.checked)} />
                Le nom sur la pièce correspond au nom déclaré « {selected.nomDeclare} ».
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={pieceValide} onChange={(e) => setPieceValide(e.target.checked)} />
                La pièce est lisible, entière, en cours de validité, et ne présente pas de signe visible de retouche.
              </label>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="motif-refus">
                Motif (obligatoire en cas de refus, transmis au signataire)
              </label>
              <textarea
                id="motif-refus"
                rows={2}
                className="border border-outline-variant rounded-lg p-3 bg-surface font-body-sm text-body-sm resize-none"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Ex : photo floue, nom illisible, pièce expirée"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={submitting || isIssuer || !nomConforme || !pieceValide}
                onClick={() => decide('VALIDEE')}
                className="flex-1 bg-primary text-on-primary font-label-md text-label-md py-3 rounded-lg disabled:opacity-50"
              >
                Valider l'identité
              </button>
              <button
                type="button"
                disabled={submitting || isIssuer || !motif.trim()}
                onClick={() => decide('REFUSEE')}
                className="flex-1 border border-error text-error font-label-md text-label-md py-3 rounded-lg disabled:opacity-50"
              >
                Refuser la pièce
              </button>
            </div>
            {selected.supprimeLe && (
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Sans décision, la pièce sera supprimée automatiquement le {new Date(selected.supprimeLe).toLocaleDateString('fr-FR')}.
              </p>
            )}
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant p-10 text-center font-body-md text-body-md text-on-surface-variant">
            Sélectionnez une pièce à contrôler.
          </div>
        )}
      </div>
    </AppShell>
  )
}
