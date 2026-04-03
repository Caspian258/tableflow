import type { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/authenticate.js'
import { getBillingStatus, createCheckout, handleWebhook } from '../controllers/billing.controller.js'

export async function billingRoutes(app: FastifyInstance) {
  // El webhook de Stripe necesita el body crudo (sin parsear) para verificar la firma
  app.post('/billing/webhook', {
    config: { rawBody: true },
    handler: handleWebhook,
  })

  // Rutas protegidas
  const guard = { preHandler: requireRole('owner') }

  app.get('/billing/status', { preHandler: authenticate }, getBillingStatus)
  app.post('/billing/create-checkout', guard, createCheckout)
}
