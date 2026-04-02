import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import sensible from '@fastify/sensible'
import { authRoutes } from './routes/auth.js'
import { tableRoutes } from './routes/tables.js'
import { menuRoutes } from './routes/menu.js'
import { orderRoutes } from './routes/orders.js'
import { initSocket } from './lib/socket.js'

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

await app.register(authRoutes)
await app.register(tableRoutes)
await app.register(menuRoutes)
await app.register(orderRoutes)

// ─── Socket.io ────────────────────────────────────────────────────────────────

await app.ready()
initSocket(app.server, app)

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3001)

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
