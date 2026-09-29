// Client HTTP centralisé — point de passage unique vers l'API décrite dans
// API_CONTRACT.md. Aucune logique métier ici : on sérialise la requête, on
// attache le token si nécessaire, et on normalise les erreurs au format
// { error: { code, message } } défini par le contrat.

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'

export interface ApiErrorShape {
  code: string
  message: string
}

/** Erreur normalisée levée par apiRequest — toujours un code + un message lisible. */
export class ApiRequestError extends Error {
  code: string
  status: number

  constructor(status: number, error: ApiErrorShape) {
    super(error.message)
    this.name = 'ApiRequestError'
    this.code = error.code
    this.status = status
  }
}

let authToken: string | null = null

/** Définit (ou efface avec null) le token attaché aux requêtes authentifiées. Appelé uniquement par AuthContext. */
export function setAuthToken(token: string | null) {
  authToken = token
}

let unauthorizedHandler: ((error: ApiRequestError) => void) | null = null

/**
 * Appelé quand le serveur refuse une requête authentifiée (401) — session
 * expirée sur inactivité, révoquée ou invalide. Enregistré par AuthContext
 * pour nettoyer la session locale et renvoyer vers la connexion.
 */
export function setUnauthorizedHandler(handler: ((error: ApiRequestError) => void) | null) {
  unauthorizedHandler = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  /** Passer à false pour les endpoints publics listés dans API_CONTRACT.md (verify, auth/login, auth/otp/*, sign/link/*). */
  auth?: boolean
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = options

  const headers: Record<string, string> = {}
  let requestBody: BodyInit | undefined

  if (body instanceof FormData) {
    requestBody = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    requestBody = JSON.stringify(body)
  }

  if (auth) {
    if (!authToken) {
      // Filet de sécurité côté client : on ne part jamais en requête "protégée"
      // sans token — cohérent avec ProtectedRoute, qui empêche déjà d'atteindre
      // cet appel sans session. Le serveur reste seul juge final.
      throw new ApiRequestError(401, { code: 'NO_TOKEN', message: 'Session expirée. Veuillez vous reconnecter.' })
    }
    headers.Authorization = `Bearer ${authToken}`
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: requestBody, signal })
  } catch {
    throw new ApiRequestError(0, {
      code: 'NETWORK_ERROR',
      message: 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.',
    })
  }

  const raw = await response.text()
  let payload: unknown = null
  if (raw) {
    try {
      payload = JSON.parse(raw)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const shaped = (payload as { error?: ApiErrorShape } | null)?.error
    const error = new ApiRequestError(response.status, shaped ?? { code: 'UNKNOWN_ERROR', message: `Erreur inattendue (${response.status}).` })
    if (auth && response.status === 401) unauthorizedHandler?.(error)
    throw error
  }

  return payload as T
}

/**
 * Récupère un fichier binaire sur un endpoint authentifié (PDF, photo) et
 * renvoie une URL objet locale utilisable dans un <iframe>/<img src>.
 * L'appelant doit révoquer l'URL (URL.revokeObjectURL) une fois l'aperçu
 * démonté ou remplacé, pour ne pas fuiter la mémoire du navigateur.
 */
export async function fetchAuthedFileUrl(path: string, signal?: AbortSignal): Promise<string> {
  if (!authToken) {
    throw new ApiRequestError(401, { code: 'NO_TOKEN', message: 'Session expirée. Veuillez vous reconnecter.' })
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${authToken}` }, signal })
  } catch {
    throw new ApiRequestError(0, {
      code: 'NETWORK_ERROR',
      message: 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.',
    })
  }

  if (!response.ok) {
    let shaped: ApiErrorShape | undefined
    try {
      shaped = ((await response.json()) as { error?: ApiErrorShape }).error
    } catch {
      // réponse d'erreur non-JSON — message générique ci-dessous
    }
    const error = new ApiRequestError(response.status, shaped ?? { code: 'UNKNOWN_ERROR', message: `Erreur inattendue (${response.status}).` })
    if (response.status === 401) unauthorizedHandler?.(error)
    throw error
  }

  const blob = await response.blob()
  return URL.createObjectURL(blob)
}
