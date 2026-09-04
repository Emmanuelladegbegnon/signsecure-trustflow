import { z } from 'zod'

const newUserSchema = z.object({
  nom: z.string().min(1),
  prenom: z.string().min(1),
  email: z.string().email(),
  telephone: z.string().min(1),
  roles: z.array(z.string()).min(1, 'Au moins un rôle est requis.'),
})

export const createUserSchema = newUserSchema

export const bulkCreateUsersSchema = z.object({
  users: z.array(newUserSchema).min(1),
})

export const updateRolesSchema = z.object({
  roles: z.array(z.string()).min(1, 'Au moins un rôle est requis.'),
})

export const auditQuerySchema = z.object({
  acteur: z.string().optional(),
  action: z.string().optional(),
  date: z.string().optional(),
})
