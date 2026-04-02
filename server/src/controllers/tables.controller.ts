import type { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const UpdateTableStatusSchema = z.object({
  status: z.enum(['available', 'occupied', 'reserved', 'cleaning']),
})

export async function listTables(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = request.user
  if (!restaurantId) return reply.code(403).send({ error: 'Acceso denegado' })

  const tables = await prisma.table.findMany({
    where: { restaurantId },
    orderBy: { number: 'asc' },
    select: { id: true, number: true, name: true, capacity: true, status: true },
  })

  return reply.send({ data: tables })
}

export async function updateTableStatus(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = request.user
  if (!restaurantId) return reply.code(403).send({ error: 'Acceso denegado' })

  const { id } = request.params as { id: string }

  const result = UpdateTableStatusSchema.safeParse(request.body)
  if (!result.success) {
    return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() })
  }

  const table = await prisma.table.findFirst({ where: { id, restaurantId } })
  if (!table) return reply.code(404).send({ error: 'Mesa no encontrada' })

  const updated = await prisma.table.update({
    where: { id },
    data: { status: result.data.status },
    select: { id: true, number: true, name: true, capacity: true, status: true },
  })

  return reply.send({ data: updated })
}
