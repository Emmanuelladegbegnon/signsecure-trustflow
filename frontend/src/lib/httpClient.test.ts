import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, ApiRequestError, setReauthHandler } from './httpClient'

async function captureError(promise: Promise<unknown>): Promise<ApiRequestError> {
  try {
    await promise
  } catch (err) {
    if (err instanceof ApiRequestError) return err
    throw err
  }
  throw new Error('Expected the promise to reject')
}

function mockFetchOnce(status: number, body: unknown, ok = status >= 200 && status < 300) {
  const text = body === undefined ? '' : JSON.stringify(body)
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      text: () => Promise.resolve(text),
    }),
  )
}

describe('httpClient / apiRequest', () => {
  beforeEach(() => {
    setReauthHandler(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the parsed JSON body on success', async () => {
    mockFetchOnce(200, { hello: 'world' })
    const result = await apiRequest<{ hello: string }>('/ping', { auth: false })
    expect(result).toEqual({ hello: 'world' })
  })

  it('throws ApiRequestError with the server-provided code/message on a non-2xx response', async () => {
    mockFetchOnce(400, { error: { code: 'BAD_INPUT', message: 'Champ requis manquant.' } })
    await expect(apiRequest('/documents', { method: 'POST', auth: false })).rejects.toMatchObject({
      code: 'BAD_INPUT',
      message: 'Champ requis manquant.',
      status: 400,
    })
  })

  it('falls back to UNKNOWN_ERROR when the error body is missing or malformed', async () => {
    mockFetchOnce(500, undefined)
    const err = await captureError(apiRequest('/documents', { auth: false }))
    expect(err.code).toBe('UNKNOWN_ERROR')
    expect(err.status).toBe(500)
  })

  it('throws a NETWORK_ERROR when fetch itself rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )
    const err = await captureError(apiRequest('/documents', { auth: false }))
    expect(err.code).toBe('NETWORK_ERROR')
    expect(err.status).toBe(0)
  })

  it('sends the session cookie and the anti-CSRF header, never a bearer token', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('{}') })
    vi.stubGlobal('fetch', fetchSpy)

    await apiRequest('/documents')

    const [, init] = fetchSpy.mock.calls[0]
    expect(init.credentials).toBe('include')
    expect(init.headers['X-Requested-With']).toBe('SignSecure')
    expect(init.headers.Authorization).toBeUndefined()
  })

  it('asks for a re-confirmation code on REAUTH_REQUIRED, then replays the request once', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 403, text: () => Promise.resolve(JSON.stringify({ error: { code: 'REAUTH_REQUIRED', message: 'x' } })) })
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('{"success":true}') })
    vi.stubGlobal('fetch', fetchSpy)
    const handler = vi.fn().mockResolvedValue(true)
    setReauthHandler(handler)

    const result = await apiRequest('/documents/1/revoquer', { method: 'POST', body: { motif: 'test' } })

    expect(handler).toHaveBeenCalledOnce()
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ success: true })
  })

  it('serializes a plain object body as JSON with a Content-Type header', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('{}') })
    vi.stubGlobal('fetch', fetchSpy)

    await apiRequest('/auth/login', { method: 'POST', auth: false, body: { email: 'a@b.com' } })

    const [, init] = fetchSpy.mock.calls[0]
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ email: 'a@b.com' }))
  })

  it('sends a FormData body as-is, without forcing a Content-Type header', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('{}') })
    vi.stubGlobal('fetch', fetchSpy)

    const formData = new FormData()
    formData.append('fichier', new File(['x'], 'x.pdf'))

    await apiRequest('/documents', { method: 'POST', auth: false, body: formData })

    const [, init] = fetchSpy.mock.calls[0]
    expect(init.body).toBe(formData)
    expect(init.headers['Content-Type']).toBeUndefined()
  })
})
