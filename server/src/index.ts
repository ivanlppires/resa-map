import 'dotenv/config'
import path from 'node:path'
import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyStatic from '@fastify/static'
import { ZodError } from 'zod'
import { accessRoutes } from './access.js'
import { apiRoutes } from './routes.js'

const app = Fastify({ logger: true })

app.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({ error: 'Validation error', details: error.issues })
  }
  app.log.error(error)
  reply.status(error.statusCode ?? 500).send({ error: error.message })
})

await app.register(fastifyCookie)
await app.register(accessRoutes)
await app.register(apiRoutes)

// Em produção o próprio servidor serve o build do frontend (STATIC_DIR).
const staticDir = process.env.STATIC_DIR
if (staticDir) {
  await app.register(fastifyStatic, {
    root: path.resolve(staticDir),
    maxAge: '1h',
    immutable: false,
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      else if (filePath.endsWith('.geojson')) res.setHeader('Cache-Control', 'public, max-age=86400')
    },
  })
  app.setNotFoundHandler((request, reply) => {
    if (request.raw.url?.startsWith('/api/')) return reply.status(404).send({ error: 'Not found' })
    return reply.sendFile('index.html')
  })
}

const port = Number(process.env.PORT) || 3100
const host = process.env.HOST || '0.0.0.0'
try {
  await app.listen({ port, host })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
