import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app.js'
import { getTestOtpProvider } from '../../lib/otpProvider.js'
import { createTestOrganization, createTestUser } from '../../test/factories.js'

const app = createApp()

describe('Auth — login → OTP → session', () => {
  it('refuse un mot de passe incorrect avec un message générique', async () => {
    const org = await createTestOrganization()
    const { email } = await createTestUser({ organizationId: org.id, roles: ['SIGNATAIRE'] })

    const res = await request(app).post('/api/auth/login').send({ email, password: 'mauvais-mot-de-passe' })

    expect(res.status).toBe(401)
    // Message générique : ne désigne jamais un champ précis comme fautif (email vs mot de passe).
    expect(res.body.error.message).toBe('Email ou mot de passe incorrect.')
  })

  it('verrouille le compte après ACCOUNT_LOCK_THRESHOLD tentatives échouées', async () => {
    const org = await createTestOrganization()
    const { email } = await createTestUser({ organizationId: org.id, roles: ['SIGNATAIRE'] })

    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').send({ email, password: 'faux' })
    }
    const res = await request(app).post('/api/auth/login').send({ email, password: 'faux' })
    expect(res.status).toBe(401)
    expect(res.body.error.message).toMatch(/verrouillé/i)
  })

  it('mène jusqu\'à un token valide via le parcours complet login + OTP', async () => {
    const org = await createTestOrganization()
    const { email, password } = await createTestUser({ organizationId: org.id, roles: ['ADMINISTRATEUR'] })

    const login = await request(app).post('/api/auth/login').send({ email, password })
    expect(login.status).toBe(200)
    expect(login.body.requiresOtp).toBe(true)

    const code = getTestOtpProvider().lastCodeFor(email)
    expect(code).toBeDefined()

    const verify = await request(app).post('/api/auth/otp/verify').send({ email, code })
    expect(verify.status).toBe(200)
    expect(verify.body.token).toBeTypeOf('string')
    expect(verify.body.user.roles).toEqual(['Administrateur'])

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${verify.body.token}`)
    expect(me.status).toBe(200)
    expect(me.body.email).toBe(email)
  })

  it("refuse l'accès à /me sans token", async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })
})
