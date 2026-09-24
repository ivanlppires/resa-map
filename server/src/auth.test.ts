import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import bcrypt from 'bcryptjs'
import { buildAuth, signSession, verifySession, COOKIE, type UserRecord } from './auth.js'

const SECRET = 'test-secret'

async function makeApp(users: UserRecord[], now = () => 1_000_000) {
  const auth = buildAuth({
    secret: SECRET, secure: false, now,
    findUserByEmail: async (email) => users.find((u) => u.email === email) ?? null,
  })
  const app = Fastify()
  await app.register(fastifyCookie)
  await app.register(auth.routes)
  app.get('/protected', { preHandler: [auth.requireAuth] }, async (req) => ({ who: req.sessionUser }))
  return app
}

describe('sessão assinada', () => {
  const user = { id: 1, name: 'Admin', email: 'admin@resa.unemat.br', role: 'admin' as const }
  it('assina e verifica', () => {
    const t = signSession(user, SECRET, 0)
    expect(verifySession(t, SECRET, 1000)).toEqual(user)
  })
  it('rejeita assinatura de outro segredo, token adulterado e expirado', () => {
    const t = signSession(user, SECRET, 0)
    expect(verifySession(t, 'outro', 1000)).toBeNull()
    expect(verifySession(t.slice(0, -2) + 'xx', SECRET, 1000)).toBeNull()
    expect(verifySession(t, SECRET, 31 * 86400 * 1000)).toBeNull()
    expect(verifySession(undefined, SECRET)).toBeNull()
    expect(verifySession('semponto', SECRET)).toBeNull()
  })
})

describe('login com usuários do resa-survey', () => {
  const hash = bcrypt.hashSync('admin123', 4)
  const users: UserRecord[] = [{ id: 7, name: 'Admin RESA', email: 'admin@resa.unemat.br', role: 'admin', passwordHash: hash }]

  it('aceita e-mail (qualquer caixa) + senha corretos e devolve cookie que abre rota protegida', async () => {
    const app = await makeApp(users)
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'Admin@RESA.unemat.br', password: 'admin123' } })
    expect(res.statusCode).toBe(200)
    expect(res.json().user).toEqual({ id: 7, name: 'Admin RESA', email: 'admin@resa.unemat.br', role: 'admin' })
    const cookie = res.cookies.find((c) => c.name === COOKIE)
    expect(cookie?.httpOnly).toBe(true)
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', cookies: { [COOKIE]: cookie!.value } })
    expect(me.json().user.email).toBe('admin@resa.unemat.br')
    const prot = await app.inject({ method: 'GET', url: '/protected', cookies: { [COOKIE]: cookie!.value } })
    expect(prot.json().who.id).toBe(7)
  })

  it('recusa senha errada, usuário inexistente e corpo inválido', async () => {
    const app = await makeApp(users)
    expect((await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'admin@resa.unemat.br', password: 'errada' } })).statusCode).toBe(401)
    expect((await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'nao@existe.br', password: 'admin123' } })).statusCode).toBe(401)
    expect((await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'x', password: '' } })).statusCode).toBe(400)
    expect((await app.inject({ method: 'GET', url: '/protected' })).statusCode).toBe(401)
    expect((await app.inject({ method: 'GET', url: '/api/auth/me' })).statusCode).toBe(401)
  })

  it('logout limpa o cookie', async () => {
    const app = await makeApp(users)
    const res = await app.inject({ method: 'POST', url: '/api/auth/logout' })
    const cookie = res.cookies.find((c) => c.name === COOKIE)
    expect(cookie?.value).toBe('')
  })
})
