import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import { actorFromAuth } from '../../lib/actor.js'
import { auditQuerySchema, bulkCreateUsersSchema, createUserSchema, updateRolesSchema } from './schemas.js'
import * as adminService from './service.js'

export const adminRouter = Router()
adminRouter.use(requireAuth)

// Gestion des comptes/rôles : réservée à l'Administrateur (CLAUDE.md § RBAC —
// l'attribution de rôle ne peut venir que d'un administrateur).
adminRouter.get(
  '/users',
  requireRole('ADMINISTRATEUR'),
  asyncHandler(async (req, res) => {
    res.json(await adminService.listUsers(req.auth!.organizationId))
  }),
)

adminRouter.post(
  '/users',
  requireRole('ADMINISTRATEUR'),
  validateBody(createUserSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await adminService.createUser(req.body, actorFromAuth(req)))
  }),
)

adminRouter.post(
  '/users/bulk',
  requireRole('ADMINISTRATEUR'),
  validateBody(bulkCreateUsersSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await adminService.bulkCreateUsers(req.body.users, actorFromAuth(req)))
  }),
)

adminRouter.get(
  '/roles/profils',
  requireRole('ADMINISTRATEUR'),
  asyncHandler(async (_req, res) => {
    res.json(await adminService.listPermissionProfiles())
  }),
)

adminRouter.patch(
  '/users/:id/roles',
  requireRole('ADMINISTRATEUR'),
  validateBody(updateRolesSchema),
  asyncHandler(async (req, res) => {
    res.json(await adminService.updateUserRoles(req.params.id, req.body.roles, actorFromAuth(req)))
  }),
)

// Consultation de l'audit : Administrateur ET Vérificateur (CLAUDE.md § RBAC —
// le rôle Vérificateur existe précisément pour ce contrôle interne). Le
// contrat ne précise pas les rôles autorisés par endpoint ; ce choix élargit
// l'accès en lecture seule plutôt que de le restreindre au seul Administrateur.
adminRouter.get(
  '/audit',
  requireRole('ADMINISTRATEUR', 'VERIFICATEUR'),
  asyncHandler(async (req, res) => {
    const query = auditQuerySchema.parse(req.query)
    res.json(await adminService.getAuditLog(req.auth!.organizationId, query))
  }),
)
