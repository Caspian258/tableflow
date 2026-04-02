import type { FastifyInstance } from 'fastify'
import {
  getSales,
  getTopItems,
  getPeakHours,
  getPrepTimes,
} from '../controllers/analytics.controller.js'
import { requireRole } from '../middleware/authenticate.js'

const guard = { preHandler: requireRole('owner', 'manager') }

export async function analyticsRoutes(app: FastifyInstance) {
  app.get('/analytics/sales', guard, getSales)
  app.get('/analytics/top-items', guard, getTopItems)
  app.get('/analytics/peak-hours', guard, getPeakHours)
  app.get('/analytics/prep-times', guard, getPrepTimes)
}
