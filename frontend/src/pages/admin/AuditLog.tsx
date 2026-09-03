import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'

interface AuditEvent {
  actorId: string
  action: string
  objectType: string
  objectId: string
  timestampServer: string
  ip: string
  hash: string
}

interface AuditResponse {
  evenements: AuditEvent[]
}

interface AdminUserLite {
  id: string
  nom: string
  prenom: string
}

interface UsersResponse {
  users: AdminUserLite[]
}

function initialsOf(prenom: string, nom: string) {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || '·'
}

export function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [actorNames, setActorNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [acteur, setActeur] = useState('')
  const [action, setAction] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (acteur) params.set('acteur', acteur)
    if (action) params.set('action', action)
    if (date) params.set('date', date)
    const query = params.toString()

    Promise.all([
      apiRequest<AuditResponse>(`/admin/audit${query ? `?${query}` : ''}`, { signal: controller.signal }),
      // Résolution actorId -> nom, en meilleur effort : si cet appel échoue (ex. droits
      // insuffisants), on affiche simplement les actorId bruts plutôt que de tout casser.
      apiRequest<UsersResponse>('/admin/users', { signal: controller.signal }).catch(() => null),
    ])
      .then(([auditRes, usersRes]) => {
        setEvents(auditRes.evenements)
        if (usersRes) {
          setActorNames(Object.fromEntries(usersRes.users.map((u) => [u.id, `${u.prenom} ${u.nom}`])))
        }
      })
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Impossible de charger le journal d'audit."))
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [acteur, action, date])

  const actionOptions = useMemo(() => Array.from(new Set(events.map((e) => e.action))).sort(), [events])

  return (
    <AppShell active="audit">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-outline-variant pb-6">
        <div>
          <h1 className="font-display text-display text-on-surface">Journal d'Audit</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">Traçabilité complète des actions système et utilisateurs.</p>
        </div>
      </div>

      {error && (
        <div className="mt-6">
          <FormAlert tone="error">{error}</FormAlert>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden flex flex-col mt-8">
        <div className="p-4 border-b border-outline-variant bg-surface-container-lowest flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-lg border border-outline-variant w-full sm:w-auto">
              <Icon name="calendar_today" size={18} className="text-on-surface-variant" />
              <input
                type="date"
                className="bg-transparent border-none text-body-sm text-on-surface focus:ring-0 p-0 w-full cursor-pointer"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-lg border border-outline-variant w-full sm:w-auto">
              <Icon name="person" size={18} className="text-on-surface-variant" />
              <select className="bg-transparent border-none text-body-sm text-on-surface focus:ring-0 p-0 pr-6 w-full cursor-pointer" value={acteur} onChange={(e) => setActeur(e.target.value)}>
                <option value="">Tous les acteurs</option>
                {Object.entries(actorNames).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-lg border border-outline-variant w-full sm:w-auto">
              <Icon name="filter_list" size={18} className="text-on-surface-variant" />
              <select className="bg-transparent border-none text-body-sm text-on-surface focus:ring-0 p-0 pr-6 w-full cursor-pointer" value={action} onChange={(e) => setAction(e.target.value)}>
                <option value="">Toutes les actions</option>
                {actionOptions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-body-sm text-on-surface-variant whitespace-nowrap">{events.length} entrée{events.length !== 1 ? 's' : ''}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-outline-variant bg-surface">
                <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant font-semibold">Horodatage</th>
                <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant font-semibold">Acteur</th>
                <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant font-semibold">Action</th>
                <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant font-semibold">Objet</th>
                <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant font-semibold">Empreinte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-white">
              {loading && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-on-surface-variant">
                    Chargement…
                  </td>
                </tr>
              )}
              {!loading && events.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-on-surface-variant">
                    Aucun événement pour ces critères.
                  </td>
                </tr>
              )}
              {events.map((event, i) => {
                const name = actorNames[event.actorId]
                return (
                  <tr key={`${event.actorId}-${event.timestampServer}-${i}`} className="hover:bg-surface transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-mono text-body-sm text-on-surface">{event.timestampServer}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs shrink-0">
                          {name ? initialsOf(name.split(' ')[0] ?? '', name.split(' ')[1] ?? '') : <Icon name="person" size={16} />}
                        </div>
                        <div>
                          <div className="font-body-sm text-on-surface font-medium">{name ?? event.actorId}</div>
                          <div className="font-mono text-xs text-on-surface-variant">{event.ip}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-secondary-fixed text-on-secondary-fixed">{event.action}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-body-sm text-on-surface">{event.objectType}</div>
                      <div className="font-mono text-xs text-on-surface-variant mt-1 truncate max-w-[150px]">{event.objectId}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-mono text-xs text-on-surface-variant truncate max-w-[150px]" title={event.hash}>
                        {event.hash}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
