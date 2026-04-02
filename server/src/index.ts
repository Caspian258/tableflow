import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import sensible from '@fastify/sensible'

const app = Fastify({
  logger: process.env.NODE_ENV !== 'test',
})

// ─── Plugins ──────────────────────────────────────────────────────────────────

await app.register(cors, {
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
})

await app.register(jwt, {
  secret: process.env.JWT_SECRET!,
  sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' },
})

await app.register(cookie, {
  secret: process.env.JWT_SECRET!,
})

await app.register(sensible)

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

// ─── Rutas ────────────────────────────────────────────────────────────────────
// TODO: registrar rutas de auth, orders, menu, tables, etc.

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3001)

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
