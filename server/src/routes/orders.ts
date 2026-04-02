import type { FastifyInstance } from 'fastify'
import { createOrder, updateOrderStatus } from '../controllers/orders.controller.js'
import { authenticate, requireRole } from '../middleware/authenticate.js'

export async function orderRoutes(app: FastifyInstance) {
  app.post('/orders', { preHandler: requireRole('waiter', 'manager', 'owner') }, createOrder)
  app.patch('/orders/:id/status', { preHandler: authenticate }, updateOrderStatus)
}
