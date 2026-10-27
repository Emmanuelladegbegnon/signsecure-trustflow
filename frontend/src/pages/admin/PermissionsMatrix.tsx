import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'

interface Profil {
  id: string
  nom: string
  description: string
  permissions: string[]
}

interface ProfilsResponse {
  profils: Profil[]
}

/**
 * API_CONTRACT.md n'expose que GET /api/admin/roles/profils — des profils de
 * permissions PRÉDÉFINIS et en lecture seule, pour accélérer la création de
 * compte (voir POST /api/admin/users). Il n'existe aucun endpoint pour
 * éditer une matrice de permissions en direct : la maquette d'origine
 * (cases à cocher + "Enregistrer les modifications") n'a donc rien à
 * enregistrer côté serveur — remplacée ici par une vue de référence fidèle
 * au contrat plutôt que de simuler une édition qui n'existe pas.
 */
export function PermissionsMatrix() {
  const [profils, setProfils] = useState<Profil[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    apiRequest<ProfilsResponse>('/admin/roles/profils', { signal: controller.signal })
      .then((res) => setProfils(res.profils))
      .catch((err) => {
        // Ignore l'abandon déclenché par le cleanup (StrictMode double-monte
        // cet effet en dev) — pas un vrai échec réseau.
        if (controller.signal.aborted) return
        setError(err instanceof ApiRequestError ? err.message : 'Impossible de charger les profils de permissions.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  return (
    <AppShell active="permissions">
      <div className="mb-8">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Profils de permissions</h2>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
          Profils prédéfinis utilisés pour accélérer la création de compte. Cette vue est en lecture seule — il n'existe pas encore d'endpoint pour éditer les
          permissions en direct ; contactez l'équipe back si un profil doit changer.
        </p>
      </div>

      {error && <FormAlert tone="error">{error}</FormAlert>}
      {loading && <p className="font-body-sm text-body-sm text-on-surface-variant">Chargement…</p>}
      {!loading && !error && profils.length === 0 && <p className="font-body-sm text-body-sm text-on-surface-variant">Aucun profil défini.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profils.map((profil) => (
          <div key={profil.id} className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-container/10 rounded-lg text-primary">
                <Icon name="badge" />
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">{profil.nom}</h3>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{profil.description}</p>
            <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/50">
              {profil.permissions.map((permission) => (
                <div key={permission} className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface">
                  <Icon name="check_circle" filled size={16} className="text-primary" />
                  {permission}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  )
}
