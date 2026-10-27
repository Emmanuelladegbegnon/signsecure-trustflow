// Client HTTP centralisé — point de passage unique vers l'API décrite dans
// API_CONTRACT.md. Aucune logique métier ici : on sérialise la requête et on
// normalise les erreurs au format { error: { code, message } } du contrat.
//
// La session vit dans un cookie httpOnly posé par le serveur : ce code ne voit
// jamais le jeton (un script injecté ne peut donc pas le voler). Chaque requête
// porte l'en-tête X-Requested-With, exigé par le serveur contre le CSRF.

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

const CSRF_HEADERS = { 'X-Requested-With': 'SignSecure' }

let unauthorizedHandler: ((error: ApiRequestError) => void) | null = null

/**
 * Appelé quand le serveur refuse une requête authentifiée (401) — session
 * expirée sur inactivité, révoquée ou invalide. Enregistré par AuthContext
 * pour nettoyer la session locale et renvoyer vers la connexion.
 */
export function setUnauthorizedHandler(handler: ((error: ApiRequestError) => void) | null) {
  unauthorizedHandler = handler
}

let reauthHandler: (() => Promise<boolean>) | null = null

/**
 * Appelé quand le serveur exige une reconfirmation (403 REAUTH_REQUIRED) avant
 * une action sensible. Le gestionnaire (fenêtre de code, voir ReauthDialog)
 * résout true si le code a été validé : la requête est alors rejouée une fois.
 */
export function setReauthHandler(handler: (() => Promise<boolean>) | null) {
  reauthHandler = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  /** false pour les endpoints publics (verify, auth/login, auth/otp/*, sign/link/*) : un 401 n'y ferme aucune session. */
  auth?: boolean
  /** false pour ne pas signaler un 401 comme une session expirée (ex. restauration silencieuse au chargement). */
  notifyUnauthorized?: boolean
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const { method = 'GET', body, auth = true, notifyUnauthorized = true, signal } = options

  const headers: Record<string, string> = { ...CSRF_HEADERS }
  let requestBody: BodyInit | undefined

  if (body instanceof FormData) {
    requestBody = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    requestBody = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: requestBody, signal, credentials: 'include' })
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
    if (auth && notifyUnauthorized && response.status === 401) unauthorizedHandler?.(error)
    if (auth && !retried && response.status === 403 && error.code === 'REAUTH_REQUIRED' && reauthHandler) {
      if (await reauthHandler()) return apiRequest<T>(path, options, true)
    }
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
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers: CSRF_HEADERS, signal, credentials: 'include' })
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
