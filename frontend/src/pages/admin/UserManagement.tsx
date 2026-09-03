import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { FormAlert } from '../../components/ui/FormAlert'
import { Icon } from '../../components/ui/Icon'
import { apiRequest, ApiRequestError } from '../../lib/httpClient'
import { ROLES, type Role } from '../../roles'

type UserStatus = 'invite' | 'actif' | 'suspendu'

interface AdminUser {
  id: string
  nom: string
  prenom: string
  email: string
  roles: string[]
  statut: UserStatus
}

interface UsersResponse {
  users: AdminUser[]
}

interface NewUserDraft {
  nom: string
  prenom: string
  email: string
  telephone: string
  roles: Role[]
}

const emptyDraft = (): NewUserDraft => ({ nom: '', prenom: '', email: '', telephone: '', roles: [] })

const STATUS_CONFIG: Record<UserStatus, { label: string; icon: string; className: string }> = {
  actif: { label: 'Actif', icon: 'check_circle', className: 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]' },
  invite: { label: 'Invité', icon: 'mail', className: 'bg-[#FFF0E0] text-[#E67C1E] border-[#FFE0C2]' },
  suspendu: { label: 'Suspendu', icon: 'block', className: 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]' },
}

const ROLE_STYLES: Record<Role, string> = {
  Administrateur: 'bg-primary-container/20 text-primary-container border-primary-container/30',
  Signataire: 'bg-tertiary-container/20 text-tertiary-container border-tertiary-container/30',
  Superviseur: 'bg-secondary-container/50 text-on-secondary-container border-secondary-container',
  Vérificateur: 'bg-secondary-container/50 text-on-secondary-container border-secondary-container',
  'Agent de réception': 'bg-secondary-container/50 text-on-secondary-container border-secondary-container',
}

function initialsOf(prenom: string, nom: string) {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || '·'
}

export function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [inviteOpen, setInviteOpen] = useState(false)
  const [draft, setDraft] = useState<NewUserDraft>(emptyDraft())
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)

  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkRows, setBulkRows] = useState<NewUserDraft[]>([emptyDraft()])
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkResult, setBulkResult] = useState<{ created: number; errors: { email: string; reason: string }[] } | null>(null)
  const [bulkSubmitting, setBulkSubmitting] = useState(false)

  const [rolesEditFor, setRolesEditFor] = useState<AdminUser | null>(null)
  const [rolesDraft, setRolesDraft] = useState<Role[]>([])
  const [rolesSaving, setRolesSaving] = useState(false)
  const [rolesError, setRolesError] = useState<string | null>(null)

  const loadUsers = () => {
    setLoading(true)
    setLoadError(null)
    return apiRequest<UsersResponse>('/admin/users')
      .then((res) => setUsers(res.users))
      .catch((err) => setLoadError(err instanceof ApiRequestError ? err.message : 'Impossible de charger les utilisateurs.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      const matchesSearch = !q || `${u.prenom} ${u.nom}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      const matchesRole = !roleFilter || u.roles.includes(roleFilter)
      const matchesStatus = !statusFilter || u.statut === statusFilter
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, search, roleFilter, statusFilter])

  const toggleDraftRole = (setter: (fn: (prev: NewUserDraft) => NewUserDraft) => void, role: Role) => {
    setter((prev) => ({ ...prev, roles: prev.roles.includes(role) ? prev.roles.filter((r) => r !== role) : [...prev.roles, role] }))
  }

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault()
    setInviteError(null)
    if (!draft.nom.trim() || !draft.prenom.trim() || !draft.email.trim() || !draft.telephone.trim()) {
      setInviteError('Tous les champs sont requis.')
      return
    }
    if (draft.roles.length === 0) {
      setInviteError('Sélectionnez au moins un rôle.')
      return
    }
    setInviting(true)
    try {
      await apiRequest('/admin/users', {
        method: 'POST',
        body: { nom: draft.nom.trim(), prenom: draft.prenom.trim(), email: draft.email.trim(), telephone: draft.telephone.trim(), roles: draft.roles },
      })
      setInviteOpen(false)
      setDraft(emptyDraft())
      loadUsers()
    } catch (err) {
      setInviteError(err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setInviting(false)
    }
  }

  const handleBulkSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBulkError(null)
    setBulkResult(null)
    const rows = bulkRows.filter((r) => r.nom.trim() || r.prenom.trim() || r.email.trim())
    if (rows.length === 0) {
      setBulkError('Ajoutez au moins un utilisateur.')
      return
    }
    setBulkSubmitting(true)
    try {
      const res = await apiRequest<{ created: { userId: string; email: string }[]; errors: { email: string; reason: string }[] }>('/admin/users/bulk', {
        method: 'POST',
        body: { users: rows.map((r) => ({ nom: r.nom.trim(), prenom: r.prenom.trim(), email: r.email.trim(), telephone: r.telephone.trim(), roles: r.roles })) },
      })
      setBulkResult({ created: res.created.length, errors: res.errors })
      if (res.errors.length === 0) {
        setBulkRows([emptyDraft()])
      }
      loadUsers()
    } catch (err) {
      setBulkError(err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setBulkSubmitting(false)
    }
  }

  const openRolesEdit = (user: AdminUser) => {
    setRolesEditFor(user)
    setRolesDraft(user.roles.filter((r): r is Role => (ROLES as readonly string[]).includes(r)))
    setRolesError(null)
  }

  const saveRoles = async () => {
    if (!rolesEditFor) return
    setRolesSaving(true)
    setRolesError(null)
    try {
      await apiRequest(`/admin/users/${rolesEditFor.id}/roles`, { method: 'PATCH', body: { roles: rolesDraft } })
      setUsers((prev) => prev.map((u) => (u.id === rolesEditFor.id ? { ...u, roles: rolesDraft } : u)))
      setRolesEditFor(null)
    } catch (err) {
      setRolesError(err instanceof ApiRequestError ? err.message : 'Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setRolesSaving(false)
    }
  }

  return (
    <AppShell active="users">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Gestion des utilisateurs</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">Gérez les accès, rôles et statuts de votre organisation.</p>
        </div>
        <div className="flex gap-3">
          <button
            className="border border-outline-variant text-on-surface px-4 py-2.5 rounded-md font-label-md text-label-md hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
            onClick={() => {
              setBulkResult(null)
              setBulkError(null)
              setBulkOpen(true)
            }}
          >
            <Icon name="upload_file" />
            <span>Importer en masse</span>
          </button>
          <button
            className="bg-primary text-on-primary px-6 py-2.5 rounded-md font-label-md text-label-md shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            onClick={() => setInviteOpen(true)}
          >
            <Icon name="person_add" />
            <span>Inviter un utilisateur</span>
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant flex flex-col md:flex-row gap-4 justify-between items-center mt-6">
        <div className="relative w-full md:w-96">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-md bg-surface text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            placeholder="Rechercher par nom, email..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <select className="border border-outline-variant rounded-md px-3 py-2 bg-surface text-body-sm focus:border-primary outline-none w-full md:w-auto" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">Tous les rôles</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <select className="border border-outline-variant rounded-md px-3 py-2 bg-surface text-body-sm focus:border-primary outline-none w-full md:w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tous les statuts</option>
            {(Object.keys(STATUS_CONFIG) as UserStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadError && (
        <div className="mt-6">
          <FormAlert tone="error">{loadError}</FormAlert>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Nom complet</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Rôle(s)</th>
                <th className="p-4 font-semibold">Statut</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-body-sm text-body-sm text-on-surface">
              {loading && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-on-surface-variant">
                    Chargement…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-on-surface-variant">
                    Aucun utilisateur ne correspond à ces critères.
                  </td>
                </tr>
              )}
              {filtered.map((user) => {
                const status = STATUS_CONFIG[user.statut] ?? STATUS_CONFIG.invite
                return (
                  <tr key={user.id} className="hover:bg-surface transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs">
                          {initialsOf(user.prenom, user.nom)}
                        </div>
                        <span className="font-medium">
                          {user.prenom} {user.nom}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-on-surface-variant">{user.email}</td>
                    <td className="p-4">
                      <div className="flex gap-2 flex-wrap">
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm border ${
                              ROLE_STYLES[role as Role] ?? 'bg-surface-container text-on-surface-variant border-outline-variant'
                            }`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-sm text-label-sm border ${status.className}`}>
                        <Icon name={status.icon} size={14} />
                        {status.label}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        className="text-on-surface-variant hover:text-primary p-1 rounded-full hover:bg-surface-container-high transition-colors"
                        onClick={() => openRolesEdit(user)}
                        title="Modifier les rôles"
                      >
                        <Icon name="edit" size={18} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-outline-variant flex items-center justify-between text-body-sm text-on-surface-variant">
          <div>
            Affichage {filtered.length} sur {users.length}
          </div>
        </div>
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setInviteOpen(false)}>
          <div className="bg-surface-container-lowest rounded-xl shadow-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Inviter un utilisateur</h2>
              <button className="text-on-surface-variant hover:text-on-surface" onClick={() => setInviteOpen(false)} type="button">
                <Icon name="close" />
              </button>
            </div>
            <form className="flex flex-col gap-4" onSubmit={handleInvite} noValidate>
              {inviteError && <FormAlert tone="error">{inviteError}</FormAlert>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface mb-1" htmlFor="invite-prenom">
                    Prénom
                  </label>
                  <input
                    className="w-full border border-outline-variant rounded-lg px-3 py-2 bg-surface text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    id="invite-prenom"
                    value={draft.prenom}
                    onChange={(e) => setDraft((p) => ({ ...p, prenom: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface mb-1" htmlFor="invite-nom">
                    Nom
                  </label>
                  <input
                    className="w-full border border-outline-variant rounded-lg px-3 py-2 bg-surface text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    id="invite-nom"
                    value={draft.nom}
                    onChange={(e) => setDraft((p) => ({ ...p, nom: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface mb-1" htmlFor="invite-email">
                  Adresse e-mail
                </label>
                <input
                  className="w-full border border-outline-variant rounded-lg px-3 py-2 bg-surface text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  id="invite-email"
                  placeholder="nom@entreprise.ci"
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface mb-1" htmlFor="invite-telephone">
                  Téléphone
                </label>
                <input
                  className="w-full border border-outline-variant rounded-lg px-3 py-2 bg-surface text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  id="invite-telephone"
                  placeholder="+229 97 00 00 00"
                  type="tel"
                  value={draft.telephone}
                  onChange={(e) => setDraft((p) => ({ ...p, telephone: e.target.value }))}
                />
              </div>
              <div>
                <span className="block font-label-sm text-label-sm text-on-surface mb-2">Rôle(s)</span>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <label
                      key={role}
                      className={`px-3 py-1.5 rounded-full border font-label-sm text-label-sm cursor-pointer transition-colors ${
                        draft.roles.includes(role) ? 'bg-primary text-on-primary border-primary' : 'bg-surface border-outline-variant text-on-surface hover:bg-surface-container-low'
                      }`}
                    >
                      <input type="checkbox" className="sr-only" checked={draft.roles.includes(role)} onChange={() => toggleDraftRole(setDraft, role)} />
                      {role}
                    </label>
                  ))}
                </div>
              </div>
              <button
                className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                type="submit"
                disabled={inviting}
              >
                {inviting && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />}
                {inviting ? 'Envoi…' : "Envoyer l'invitation"}
              </button>
            </form>
          </div>
        </div>
      )}

      {bulkOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setBulkOpen(false)}>
          <div className="bg-surface-container-lowest rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Importer des utilisateurs en masse</h2>
              <button className="text-on-surface-variant hover:text-on-surface" onClick={() => setBulkOpen(false)} type="button">
                <Icon name="close" />
              </button>
            </div>

            {bulkResult && (
              <div className="mb-4 flex flex-col gap-2">
                <FormAlert tone={bulkResult.errors.length === 0 ? 'success' : 'info'}>
                  {bulkResult.created} compte{bulkResult.created !== 1 ? 's' : ''} créé{bulkResult.created !== 1 ? 's' : ''}
                  {bulkResult.errors.length > 0 ? `, ${bulkResult.errors.length} erreur(s).` : '.'}
                </FormAlert>
                {bulkResult.errors.map((e, i) => (
                  <FormAlert key={i} tone="error">
                    {e.email} — {e.reason}
                  </FormAlert>
                ))}
              </div>
            )}
            {bulkError && (
              <div className="mb-4">
                <FormAlert tone="error">{bulkError}</FormAlert>
              </div>
            )}

            <form className="flex flex-col gap-4" onSubmit={handleBulkSubmit}>
              <div className="flex flex-col gap-3">
                {bulkRows.map((row, i) => (
                  <div key={i} className="border border-outline-variant rounded-lg p-3 flex flex-col gap-2 relative">
                    {bulkRows.length > 1 && (
                      <button
                        type="button"
                        className="absolute top-2 right-2 text-on-surface-variant hover:text-error"
                        onClick={() => setBulkRows((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Icon name="close" size={16} />
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="border border-outline-variant rounded-md px-2 py-1.5 bg-surface text-body-sm outline-none focus:border-primary"
                        placeholder="Prénom"
                        value={row.prenom}
                        onChange={(e) => setBulkRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, prenom: e.target.value } : r)))}
                      />
                      <input
                        className="border border-outline-variant rounded-md px-2 py-1.5 bg-surface text-body-sm outline-none focus:border-primary"
                        placeholder="Nom"
                        value={row.nom}
                        onChange={(e) => setBulkRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, nom: e.target.value } : r)))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="border border-outline-variant rounded-md px-2 py-1.5 bg-surface text-body-sm outline-none focus:border-primary"
                        placeholder="Email"
                        type="email"
                        value={row.email}
                        onChange={(e) => setBulkRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, email: e.target.value } : r)))}
                      />
                      <input
                        className="border border-outline-variant rounded-md px-2 py-1.5 bg-surface text-body-sm outline-none focus:border-primary"
                        placeholder="Téléphone"
                        value={row.telephone}
                        onChange={(e) => setBulkRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, telephone: e.target.value } : r)))}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ROLES.map((role) => (
                        <label
                          key={role}
                          className={`px-2 py-1 rounded-full border font-label-sm text-[11px] cursor-pointer transition-colors ${
                            row.roles.includes(role) ? 'bg-primary text-on-primary border-primary' : 'bg-surface border-outline-variant text-on-surface'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={row.roles.includes(role)}
                            onChange={() =>
                              setBulkRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, roles: r.roles.includes(role) ? r.roles.filter((x) => x !== role) : [...r.roles, role] } : r)))
                            }
                          />
                          {role}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="w-full border border-dashed border-outline text-secondary hover:text-primary hover:border-primary rounded-lg py-2.5 flex items-center justify-center gap-2 font-label-md text-label-md"
                onClick={() => setBulkRows((prev) => [...prev, emptyDraft()])}
              >
                <Icon name="add" />
                Ajouter une ligne
              </button>
              <button
                className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                type="submit"
                disabled={bulkSubmitting}
              >
                {bulkSubmitting && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />}
                {bulkSubmitting ? 'Import…' : `Importer ${bulkRows.length} utilisateur${bulkRows.length !== 1 ? 's' : ''}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {rolesEditFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setRolesEditFor(null)}>
          <div className="bg-surface-container-lowest rounded-xl shadow-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">
                Rôles — {rolesEditFor.prenom} {rolesEditFor.nom}
              </h2>
              <button className="text-on-surface-variant hover:text-on-surface" onClick={() => setRolesEditFor(null)} type="button">
                <Icon name="close" />
              </button>
            </div>
            {rolesError && (
              <div className="mb-4">
                <FormAlert tone="error">{rolesError}</FormAlert>
              </div>
            )}
            <div className="flex flex-col gap-2 mb-4">
              {ROLES.map((role) => (
                <label key={role} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-outline text-primary focus:ring-primary"
                    checked={rolesDraft.includes(role)}
                    onChange={() => setRolesDraft((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]))}
                  />
                  <span className="font-body-sm text-body-sm text-on-surface">{role}</span>
                </label>
              ))}
            </div>
            <button
              className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              onClick={saveRoles}
              disabled={rolesSaving}
              type="button"
            >
              {rolesSaving && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />}
              {rolesSaving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
