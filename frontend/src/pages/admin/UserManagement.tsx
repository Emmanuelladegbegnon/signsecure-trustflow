import { useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Icon } from '../../components/ui/Icon'
import { StatusChip, type StatusKind } from '../../components/ui/StatusChip'

interface UserRow {
  initials: string
  name: string
  email: string
  roles: string[]
  status: StatusKind
}

const USERS: UserRow[] = [
  { initials: 'KD', name: 'Kouassi Diallo', email: 'k.diallo@entreprise.ci', roles: ['Administrateur', 'Signataire'], status: 'actif' },
  { initials: 'FT', name: 'Fatou Traoré', email: 'f.traore@entreprise.ci', roles: ['Signataire'], status: 'attente' },
  { initials: 'JB', name: 'Jean Bamba', email: 'j.bamba@entreprise.ci', roles: ['Observateur'], status: 'inactif' },
]

const ROLE_STYLES: Record<string, string> = {
  Administrateur: 'bg-primary-container/20 text-primary-container border-primary-container/30',
  Signataire: 'bg-tertiary-container/20 text-tertiary-container border-tertiary-container/30',
  Observateur: 'bg-secondary-container/50 text-on-secondary-container border-secondary-container',
}

export function UserManagement() {
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <AppShell active="users">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Gestion des utilisateurs</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">Gérez les accès, rôles et statuts de votre organisation.</p>
        </div>
        <button
          className="bg-primary text-on-primary px-6 py-2.5 rounded-md font-label-md text-label-md shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          onClick={() => setInviteOpen(true)}
        >
          <Icon name="person_add" />
          <span>Inviter un utilisateur</span>
        </button>
      </div>

      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant flex flex-col md:flex-row gap-4 justify-between items-center mt-6">
        <div className="relative w-full md:w-96">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-md bg-surface text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            placeholder="Rechercher par nom, email..."
            type="text"
          />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <select className="border border-outline-variant rounded-md px-3 py-2 bg-surface text-body-sm focus:border-primary outline-none w-full md:w-auto">
            <option>Tous les rôles</option>
            <option>Administrateur</option>
            <option>Signataire</option>
            <option>Observateur</option>
          </select>
          <select className="border border-outline-variant rounded-md px-3 py-2 bg-surface text-body-sm focus:border-primary outline-none w-full md:w-auto">
            <option>Tous les statuts</option>
            <option>Actif</option>
            <option>En attente</option>
            <option>Inactif</option>
          </select>
        </div>
      </div>

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
              {USERS.map((user) => (
                <tr key={user.email} className="hover:bg-surface transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs">{user.initials}</div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-on-surface-variant">{user.email}</td>
                  <td className="p-4">
                    <div className="flex gap-2 flex-wrap">
                      {user.roles.map((role) => (
                        <span key={role} className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm border ${ROLE_STYLES[role]}`}>
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <StatusChip status={user.status} />
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-on-surface-variant hover:text-primary p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Icon name="more_vert" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-outline-variant flex items-center justify-between text-body-sm text-on-surface-variant">
          <div>Affichage 1 à {USERS.length} sur 12</div>
          <div className="flex gap-2">
            <button className="p-1 rounded hover:bg-surface-container-high border border-outline-variant disabled:opacity-50" disabled>
              <Icon name="chevron_left" />
            </button>
            <button className="p-1 rounded hover:bg-surface-container-high border border-outline-variant">
              <Icon name="chevron_right" />
            </button>
          </div>
        </div>
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setInviteOpen(false)}>
          <div className="bg-surface-container-lowest rounded-xl shadow-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Inviter un utilisateur</h2>
              <button className="text-on-surface-variant hover:text-on-surface" onClick={() => setInviteOpen(false)}>
                <Icon name="close" />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface mb-1" htmlFor="invite-email">
                  Adresse e-mail
                </label>
                <input
                  className="w-full border border-outline-variant rounded-lg px-3 py-2 bg-surface text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  id="invite-email"
                  placeholder="nom@entreprise.ci"
                  type="email"
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface mb-1" htmlFor="invite-role">
                  Rôle
                </label>
                <select className="w-full border border-outline-variant rounded-lg px-3 py-2 bg-surface text-body-sm focus:border-primary outline-none" id="invite-role">
                  <option>Administrateur</option>
                  <option>Signataire</option>
                  <option>Observateur</option>
                </select>
              </div>
              <button
                className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity"
                onClick={() => setInviteOpen(false)}
              >
                Envoyer l'invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
