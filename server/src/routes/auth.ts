import type { FastifyInstance } from 'fastify'
import { login, loginWithPin, refresh, logout, register } from '../controllers/auth.controller.js'

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', register)
  app.post('/auth/login', login)
  app.post('/auth/login/pin', loginWithPin)
  app.post('/auth/refresh', refresh)
  app.post('/auth/logout', logout)
}
