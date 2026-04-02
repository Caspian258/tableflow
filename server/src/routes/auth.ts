import type { FastifyInstance } from 'fastify'
import { login, refresh, logout } from '../controllers/auth.controller.js'

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', login)
  app.post('/auth/refresh', refresh)
  app.post('/auth/logout', logout)
}
