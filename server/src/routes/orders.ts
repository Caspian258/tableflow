import type { FastifyInstance } from 'fastify'
import {
  listActiveOrders,
  listPaidOrders,
  createOrder,
  updateOrderStatus,
  updateOrderItems,
  createPayment,
} from '../controllers/orders.controller.js'
import { authenticate, requireRole } from '../middleware/authenticate.js'

const waiterRoles = requireRole('waiter', 'manager', 'owner')
const adminRoles = requireRole('owner', 'manager')

export async function orderRoutes(app: FastifyInstance) {
  app.get('/orders', { preHandler: authenticate }, listActiveOrders)
  app.get('/orders/history', { preHandler: adminRoles }, listPaidOrders)
  app.post('/orders', { preHandler: waiterRoles }, createOrder)
  app.patch('/orders/:id/status', { preHandler: authenticate }, updateOrderStatus)
  app.patch('/orders/:id/items', { preHandler: waiterRoles }, updateOrderItems)
  app.post('/orders/:id/payment', { preHandler: waiterRoles }, createPayment)
}
