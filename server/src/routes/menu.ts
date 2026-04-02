import type { FastifyInstance } from 'fastify'
import { getMenu } from '../controllers/menu.controller.js'
import { authenticate } from '../middleware/authenticate.js'

export async function menuRoutes(app: FastifyInstance) {
  app.get('/menu', { preHandler: authenticate }, getMenu)
}
