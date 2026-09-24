import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Portão de acesso simples por código compartilhado. Não é autenticação de
 * usuário: só evita que os dados por lote (renda, GPS) fiquem totalmente
 * públicos enquanto a plataforma está em fase de MVP. Com ACCESS_CODE vazio
 * o acesso é aberto.
 */
const COOKIE = 'resa_map_access'
const accessCode = process.env.ACCESS_CODE ?? ''
const secret = process.env.SESSION_SECRET ?? 'resa-map-dev-secret'

function tokenFor(code: string): string {
  return createHmac('sha256', secret).update(code).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

export function isOpen(): boolean {
  return accessCode === ''
}

export function hasAccess(request: FastifyRequest): boolean {
  if (isOpen()) return true
  const cookie = request.cookies[COOKIE]
  return !!cookie && safeEqual(cookie, tokenFor(accessCode))
}

export async function requireAccess(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!hasAccess(request)) {
    reply.status(401).send({ error: 'Acesso restrito' })
  }
}

export async function accessRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/session', async (request) => ({ ok: hasAccess(request), open: isOpen() }))

  app.post<{ Body: { code?: string } }>('/api/access', async (request, reply) => {
    const code = String(request.body?.code ?? '').trim()
    if (isOpen() || (code !== '' && safeEqual(code, accessCode))) {
      reply.setCookie(COOKIE, tokenFor(accessCode), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30,
      })
      return { ok: true }
    }
    return reply.status(401).send({ error: 'Código de acesso inválido' })
  })

  app.post('/api/logout', async (_request, reply) => {
    reply.clearCookie(COOKIE, { path: '/' })
    return { ok: true }
  })
}
