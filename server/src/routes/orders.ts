import type { FastifyInstance } from 'fastify'
import { listActiveOrders, createOrder, updateOrderStatus } from '../controllers/orders.controller.js'
import { authenticate, requireRole } from '../middleware/authenticate.js'

export async function orderRoutes(app: FastifyInstance) {
  app.get('/orders', { preHandler: authenticate }, listActiveOrders)
  app.post('/orders', { preHandler: requireRole('waiter', 'manager', 'owner') }, createOrder)
  app.patch('/orders/:id/status', { preHandler: authenticate }, updateOrderStatus)
}
