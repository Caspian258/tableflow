import type { FastifyInstance } from 'fastify'
import { listTables, updateTableStatus } from '../controllers/tables.controller.js'
import { authenticate } from '../middleware/authenticate.js'

export async function tableRoutes(app: FastifyInstance) {
  app.get('/tables', { preHandler: authenticate }, listTables)
  app.patch('/tables/:id/status', { preHandler: authenticate }, updateTableStatus)
}
