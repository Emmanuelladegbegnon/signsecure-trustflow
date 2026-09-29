import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'

interface Anchor {
  id: string
  date: string
  lastEventHash: string
  nombreEvenements: number
  chaineIntacte: boolean
  destinataires: string
  horodatageTiers: string | null
}

interface IntegrityResponse {
  chaineIntacte: boolean
  ruptureEvenementId: string | null
  ancrages: Anchor[]
}

/**
 * Contrôle de chaînage du journal + ancrages externes (dernier hash envoyé
 * par email aux superviseurs/administrateurs, horodatage tiers en option).
 * Comparer un hash reçu par email à la ligne correspondante ci-dessous
 * permet de détecter une réécriture complète du journal en base.
 */
export function AuditIntegrityPanel() {
  const { user } = useAuth()
  const isAdmin = user?.roles.includes('Administrateur') ?? false
  const [data, setData] = useState<IntegrityResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [anchoring, setAnchoring] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [hashToCheck, setHashToCheck] = useState('')
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<{ trouve: boolean; conclusion: string; chaineIntacteJusquIci?: boolean } | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)

  const checkAnchor = async (e: FormEvent) => {
    e.preventDefault()
    setCheckError(null)
    setCheckResult(null)
    setChecking(true)
    try {
      setCheckResult(await apiRequest('/admin/audit/controle-ancrage', { method: 'POST', body: { hash: hashToCheck.trim() } }))
    } catch (err) {
      setCheckError(err instanceof ApiRequestError ? err.message : 'Le contrôle a échoué.')
    } finally {
      setChecking(false)
    }
  }

  const load = (signal?: AbortSignal) =>
    apiRequest<IntegrityResponse>('/admin/audit/integrite', { signal })
      .then(setData)
      .catch((err) => {
        if (signal?.aborted) return
        setError(err instanceof ApiRequestError ? err.message : "Impossible de contrôler l'intégrité du journal.")
      })

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [])

  const anchorNow = async () => {
    setAnchoring(true)
    setError(null)
    setInfo(null)
    try {
      const res = await apiRequest<{ destinataires: string }>('/admin/audit/ancrage', { method: 'POST' })
      setInfo(`Dernier hash envoyé à : ${res.destinataires || 'aucun destinataire actif'}.`)
      await load()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "L'ancrage a échoué.")
    } finally {
      setAnchoring(false)
    }
  }

  return (
    <section className="mt-8 bg-surface-container-lowest rounded-xl border border-outline-variant p-6 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon
            name={data?.chaineIntacte === false ? 'gpp_bad' : 'verified'}
            className={data?.chaineIntacte === false ? 'text-error' : 'text-primary'}
          />
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Intégrité du journal</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {data === null
                ? 'Contrôle en cours…'
                : data.chaineIntacte
                  ? 'Chaînage conforme au contrôle effectué : aucun événement modifié ou supprimé détecté.'
                  : `Rupture de chaîne détectée à l'événement ${data.ruptureEvenementId}.`}
            </p>
          </div>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={anchorNow}
            disabled={anchoring}
            className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md text-label-md flex items-center gap-2 disabled:opacity-60"
          >
            <Icon name="anchor" size={18} />
            {anchoring ? 'Ancrage…' : 'Ancrer maintenant'}
          </button>
        )}
      </div>

      {error && <FormAlert tone="error">{error}</FormAlert>}
      {info && <FormAlert tone="success">{info}</FormAlert>}

      <form className="flex flex-col gap-2" onSubmit={checkAnchor}>
        <label className="font-label-md text-label-md text-on-surface" htmlFor="hash-ancrage">
          Contrôler un hash reçu par email d'ancrage
        </label>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Collez le hash d'un ancien email : s'il a disparu du journal, celui-ci a été réécrit depuis, par exemple après une compromission du
          serveur.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="hash-ancrage"
            className="flex-1 border border-outline-variant rounded-lg px-3 py-2 font-mono text-[12px] bg-surface"
            placeholder="64 caractères hexadécimaux"
            value={hashToCheck}
            onChange={(e) => setHashToCheck(e.target.value)}
          />
          <button
            type="submit"
            disabled={checking || !hashToCheck.trim()}
            className="border border-outline px-4 py-2 rounded-lg font-label-md text-label-md disabled:opacity-60"
          >
            {checking ? 'Contrôle…' : 'Contrôler'}
          </button>
        </div>
        {checkError && <FormAlert tone="error">{checkError}</FormAlert>}
        {checkResult && (
          <FormAlert tone={checkResult.trouve && checkResult.chaineIntacteJusquIci ? 'success' : 'error'}>{checkResult.conclusion}</FormAlert>
        )}
      </form>

      <div>
        <h3 className="font-label-md text-label-md text-on-surface mb-2">Ancrages externes (dernier hash envoyé hors du système)</h3>
        {data && data.ancrages.length === 0 && (
          <p className="font-body-sm text-body-sm text-on-surface-variant">Aucun ancrage pour l'instant. Un ancrage est fait automatiquement chaque jour.</p>
        )}
        {data && data.ancrages.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-sm text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Événements</th>
                  <th className="py-2 pr-4">Hash du dernier événement</th>
                  <th className="py-2 pr-4">Horodatage tiers</th>
                </tr>
              </thead>
              <tbody>
                {data.ancrages.map((a) => (
                  <tr key={a.id} className="border-b border-outline-variant/40 last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap">{new Date(a.date).toLocaleString('fr-FR')}</td>
                    <td className="py-2 pr-4">{a.nombreEvenements}</td>
                    <td className="py-2 pr-4 font-mono text-[11px] break-all" title={`Envoyé à : ${a.destinataires}`}>
                      {a.lastEventHash}
                    </td>
                    <td className="py-2 pr-4">{a.horodatageTiers ? new Date(a.horodatageTiers).toLocaleString('fr-FR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
