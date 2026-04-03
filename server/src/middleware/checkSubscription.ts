import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'

/**
 * Middleware que bloquea el acceso si la suscripción está cancelada o en mora.
 * Se debe usar DESPUÉS de authenticate o requireRole (necesita request.user).
 */
export async function checkSubscription(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = request.user

  // superadmin y usuarios sin restaurante no se bloquean
  if (!restaurantId) return

  const sub = await prisma.subscription.findUnique({ where: { restaurantId } })

  if (!sub) return // sin suscripción registrada: permitir (onboarding)

  if (sub.status === 'cancelled') {
    return reply.code(402).send({
      error: 'Suscripción cancelada. Activa tu plan para continuar.',
      code: 'SUBSCRIPTION_CANCELLED',
    })
  }

  if (sub.status === 'past_due') {
    return reply.code(402).send({
      error: 'Pago pendiente. Actualiza tu método de pago para continuar.',
      code: 'SUBSCRIPTION_PAST_DUE',
    })
  }
}
