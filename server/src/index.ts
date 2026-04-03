import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import sensible from '@fastify/sensible'
import { authRoutes } from './routes/auth.js'
import { tableRoutes } from './routes/tables.js'
import { menuRoutes } from './routes/menu.js'
import { orderRoutes } from './routes/orders.js'
import { analyticsRoutes } from './routes/analytics.js'
import { billingRoutes } from './routes/billing.js'
import { initSocket } from './lib/socket.js'

const app = Fastify({
  logger: process.env.NODE_ENV !== 'test',
})

// Capturar raw body para verificación de webhooks de Stripe
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  try {
    ;(req as unknown as { rawBody: Buffer }).rawBody = body as Buffer
    done(null, JSON.parse((body as Buffer).toString()))
  } catch (err) {
    const e = err as Error & { statusCode?: number }
    e.statusCode = 400
    done(e, undefined)
  }
})

// ─── Plugins ──────────────────────────────────────────────────────────────────

await app.register(cors, {
  origin: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : (origin, cb) => {
        // En desarrollo: permite cualquier origen localhost (puerto variable con Vite)
        if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
          cb(null, true)
        } else {
          cb(new Error('Not allowed by CORS'), false)
        }
      },
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
await app.register(analyticsRoutes)
await app.register(billingRoutes)

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
