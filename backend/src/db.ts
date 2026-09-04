import { PrismaClient } from '@prisma/client'

// Instance unique partagée par toute l'app — évite d'épuiser les connexions
// SQLite en recréant un client par requête.
export const prisma = new PrismaClient()
