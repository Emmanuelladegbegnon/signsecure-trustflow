/**
 * Erreur API — toujours restituée au client au format défini par
 * API_CONTRACT.md : { error: { code, message } }.
 */
export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }

  static badRequest(code: string, message: string) {
    return new ApiError(400, code, message)
  }

  static unauthorized(message = 'Authentification requise.') {
    return new ApiError(401, 'UNAUTHORIZED', message)
  }

  static forbidden(message = "Vous n'avez pas les droits nécessaires pour cette action.") {
    return new ApiError(403, 'FORBIDDEN', message)
  }

  static notFound(message = 'Ressource introuvable.') {
    return new ApiError(404, 'NOT_FOUND', message)
  }

  static conflict(code: string, message: string) {
    return new ApiError(409, code, message)
  }

  static gone(message = 'Ce lien a expiré ou a déjà été utilisé.') {
    return new ApiError(410, 'GONE', message)
  }

  static internal(message = 'Une erreur inattendue est survenue.') {
    return new ApiError(500, 'INTERNAL_ERROR', message)
  }
}
