import type { FastifyInstance } from 'fastify'
import rateLimit from '@fastify/rate-limit'
import { login, loginWithPin, refresh, logout, register } from '../controllers/auth.controller.js'

export async function authRoutes(app: FastifyInstance) {
  // Rate limiting para rutas de autenticación (10 intentos por minuto por IP)
  await app.register(rateLimit, {
    max: 10,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      error: 'Demasiados intentos. Espera un minuto antes de intentar de nuevo.',
    }),
  })

  app.post('/auth/register', register)
  app.post('/auth/login', login)
  app.post('/auth/login/pin', loginWithPin)
  app.post('/auth/refresh', refresh)
  app.post('/auth/logout', logout)
}
