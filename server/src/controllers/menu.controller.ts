import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'

export async function getMenu(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = request.user
  if (!restaurantId) return reply.code(403).send({ error: 'Acceso denegado' })

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId, isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      sortOrder: true,
      items: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          preparationMinutes: true,
          isAvailable: true,
          imageUrl: true,
          sortOrder: true,
        },
      },
    },
  })

  // Convertir Decimal a number para la respuesta JSON
  const data = categories.map((cat) => ({
    ...cat,
    items: cat.items.map((item) => ({
      ...item,
      price: item.price.toNumber(),
    })),
  }))

  return reply.send({ data })
}
