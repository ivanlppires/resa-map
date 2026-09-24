import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { createHmac, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

/**
 * Login com os mesmos usuários do RESA Survey: e-mail + senha conferidos
 * contra `users.password_hash` (bcrypt) do banco compartilhado. A sessão é um
 * cookie httpOnly assinado (HMAC) próprio do resa-map — não depende do JWT
 * nem do processo do resa-survey, só da tabela `users`.
 */
export const COOKIE = 'resa_map_session'
const SESSION_DAYS = 30

export type Role = 'admin' | 'interviewer' | 'viewer'
export interface SessionUser { id: number; name: string; email: string; role: Role }
export interface UserRecord extends SessionUser { passwordHash: string }

export interface AuthDeps {
  findUserByEmail: (email: string) => Promise<UserRecord | null>
  secret: string
  secure: boolean
  now?: () => number
}

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })

function b64url(buf: Buffer): string {
  return buf.toString('base64url')
}

export function signSession(user: SessionUser, secret: string, now = Date.now()): string {
  const payload = b64url(Buffer.from(JSON.stringify({ ...user, exp: now + SESSION_DAYS * 86400 * 1000 })))
  const sig = b64url(createHmac('sha256', secret).update(payload).digest())
  return `${payload}.${sig}`
}

export function verifySession(token: string | undefined, secret: string, now = Date.now()): SessionUser | null {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null
  const payload = token.slice(0, dot)
  const sig = Buffer.from(token.slice(dot + 1), 'base64url')
  const expected = createHmac('sha256', secret).update(payload).digest()
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionUser & { exp: number }
    if (typeof data.exp !== 'number' || data.exp < now) return null
    return { id: data.id, name: data.name, email: data.email, role: data.role }
  } catch {
    return null
  }
}

declare module 'fastify' {
  interface FastifyRequest { sessionUser: SessionUser | null }
}

export function buildAuth(deps: AuthDeps) {
  const now = deps.now ?? Date.now

  const userOf = (request: FastifyRequest): SessionUser | null => verifySession(request.cookies[COOKIE], deps.secret, now())

  async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = userOf(request)
    if (!user) {
      reply.status(401).send({ error: 'Não autenticado' })
      return
    }
    request.sessionUser = user
  }

  async function routes(app: FastifyInstance): Promise<void> {
    app.decorateRequest('sessionUser', null)

    app.post('/api/auth/login', async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body)
      if (!parsed.success) return reply.status(400).send({ error: 'Informe e-mail e senha' })
      const email = parsed.data.email.trim().toLowerCase()
      const user = await deps.findUserByEmail(email)
      // Compara sempre (hash fictício quando o usuário não existe) para não
      // revelar pelo tempo de resposta se o e-mail está cadastrado.
      const valid = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Z6e9E7HkVZ7OQ9Xz0M3ZbC1vY3z6u')
      if (!user || !valid) return reply.status(401).send({ error: 'E-mail ou senha incorretos' })
      const session: SessionUser = { id: user.id, name: user.name, email: user.email, role: user.role }
      reply.setCookie(COOKIE, signSession(session, deps.secret, now()), {
        path: '/', httpOnly: true, sameSite: 'lax', secure: deps.secure, maxAge: SESSION_DAYS * 86400,
      })
      return { user: session }
    })

    app.get('/api/auth/me', async (request, reply) => {
      const user = userOf(request)
      if (!user) return reply.status(401).send({ error: 'Não autenticado' })
      return { user }
    })

    app.post('/api/auth/logout', async (_request, reply) => {
      reply.clearCookie(COOKIE, { path: '/' })
      return { ok: true }
    })
  }

  return { routes, requireAuth }
}
