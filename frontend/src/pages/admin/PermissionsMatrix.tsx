import { useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Icon } from '../../components/ui/Icon'
import { ROLES, type Role } from '../../roles'

// Icônes par rôle canonique (CLAUDE.md § Modèle de rôles) — même ordre que ROLES.
const ROLE_ICON: Record<Role, string> = {
  'Agent de réception': 'move_to_inbox',
  Signataire: 'draw',
  Superviseur: 'supervisor_account',
  Vérificateur: 'verified_user',
  Administrateur: 'admin_panel_settings',
}

interface Permission {
  key: string
  label: string
  variant: 'checkbox' | 'toggle'
  /** Une valeur par rôle, dans l'ordre de ROLES. Administrateur est toujours verrouillé (accès total). */
  defaults: boolean[]
}

const GROUPS: { name: string; permissions: Permission[] }[] = [
  {
    name: 'Gestion des Documents',
    permissions: [
      // [Agent de réception, Signataire, Superviseur, Vérificateur, Administrateur]
      { key: 'doc-create', label: 'Créer de nouveaux documents', variant: 'checkbox', defaults: [false, true, true, false, true] },
      { key: 'doc-approve', label: 'Approuver/Signer', variant: 'checkbox', defaults: [false, true, true, false, true] },
    ],
  },
  {
    name: 'Gestion des Utilisateurs',
    permissions: [{ key: 'user-manage', label: 'Ajouter/Supprimer des comptes', variant: 'toggle', defaults: [false, false, false, false, true] }],
  },
]

export function PermissionsMatrix() {
  const [matrix, setMatrix] = useState<Record<string, boolean[]>>(() => Object.fromEntries(GROUPS.flatMap((g) => g.permissions).map((p) => [p.key, [...p.defaults]])))

  const toggleCell = (permKey: string, role: Role) => {
    if (role === 'Administrateur') return // droits d'administrateur verrouillés : toujours accès total
    const roleIndex = ROLES.indexOf(role)
    setMatrix((prev) => {
      const next = [...prev[permKey]]
      next[roleIndex] = !next[roleIndex]
      return { ...prev, [permKey]: next }
    })
  }

  return (
    <AppShell active="permissions">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Matrice des Rôles</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Configurez les droits d'accès granulaires pour chaque type d'utilisateur du système.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-outline-variant text-primary font-label-md text-label-md rounded-lg hover:bg-surface transition-colors">Réinitialiser</button>
          <button className="px-4 py-2 bg-primary text-white font-label-md text-label-md rounded-lg hover:bg-primary-container transition-colors shadow-sm">Enregistrer les modifications</button>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="p-4 font-label-md text-label-md text-on-surface-variant w-[30%] min-w-[250px] sticky left-0 bg-surface-container-low z-10 border-r border-outline-variant">
                  Module / Permission
                </th>
                {ROLES.map((role) => (
                  <th key={role} className="p-4 font-label-md text-label-md text-on-surface text-center min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <Icon name={ROLE_ICON[role]} className="text-outline" />
                      {role}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((group) => (
                <>
                  <tr key={group.name} className="bg-surface border-b border-outline-variant">
                    <td className="p-3 font-label-md text-label-md text-on-surface font-semibold sticky left-0 z-10 bg-surface" colSpan={ROLES.length + 1}>
                      {group.name}
                    </td>
                  </tr>
                  {group.permissions.map((perm) => (
                    <tr key={perm.key} className="border-b border-outline-variant matrix-hover transition-colors">
                      <td className="p-4 font-body-sm text-body-sm text-on-surface-variant sticky left-0 bg-surface-container-lowest z-10 border-r border-outline-variant">{perm.label}</td>
                      {ROLES.map((role, roleIndex) => {
                        const checked = matrix[perm.key][roleIndex]
                        const locked = role === 'Administrateur'
                        return (
                          <td key={role} className="p-4 text-center">
                            {perm.variant === 'checkbox' ? (
                              <input
                                checked={checked}
                                disabled={locked}
                                onChange={() => toggleCell(perm.key, role)}
                                className={`w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary ${locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                                type="checkbox"
                              />
                            ) : (
                              <label className={`relative inline-flex items-center ${locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                                <input checked={checked} disabled={locked} onChange={() => toggleCell(perm.key, role)} className="sr-only peer" type="checkbox" />
                                <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-outline-variant after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                              </label>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
