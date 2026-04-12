import type { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import type { OrderDTO, OrderItemDTO, OrderStatus } from '@tableflow/shared'
import { prisma } from '../lib/prisma.js'
import { getIO } from '../lib/socket.js'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const UpdateOrderItemsSchema = z.object({
  add: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().min(1),
        notes: z.string().optional(),
      }),
    )
    .optional(),
  cancelItemId: z.string().optional(),
})

const CreatePaymentSchema = z.object({
  method: z.enum(['cash', 'card', 'transfer']),
  tip: z.number().min(0).default(0),
  splitCount: z.number().int().min(1).optional(),
})

const CreateOrderSchema = z.object({
  tableId: z.string().min(1),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().min(1),
        notes: z.string().optional(),
      }),
    )
    .min(1, 'La orden debe tener al menos un platillo'),
  notes: z.string().optional(),
})

const UpdateOrderStatusSchema = z.object({
  status: z.enum(['in_progress', 'ready', 'delivered', 'cancelled']),
})

// Transiciones válidas por status actual
const VALID_TRANSITIONS: Record<string, OrderStatus[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  paid: [],
  cancelled: [],
}

// ─── Helper: construir OrderDTO desde la BD ───────────────────────────────────

type OrderWithDetails = Awaited<ReturnType<typeof fetchOrderWithDetails>>

async function fetchOrderWithDetails(orderId: string) {
  return prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      id: true,
      tableId: true,
      status: true,
      notes: true,
      createdAt: true,
      readyAt: true,
      deliveredAt: true,
      table: { select: { number: true } },
      waiter: { select: { name: true } },
      items: {
        select: {
          id: true,
          menuItemId: true,
          quantity: true,
          unitPrice: true,
          notes: true,
          menuItem: { select: { name: true } },
        },
      },
    },
  })
}

function toOrderDTO(order: OrderWithDetails): OrderDTO {
  const items: OrderItemDTO[] = order.items.map((item) => ({
    id: item.id,
    menuItemId: item.menuItemId,
    menuItemName: item.menuItem.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice.toNumber(),
    notes: item.notes ?? undefined,
  }))

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  return {
    id: order.id,
    tableId: order.tableId,
    tableNumber: order.table.number,
    waiterName: order.waiter.name,
    status: order.status as OrderStatus,
    items,
    notes: order.notes ?? undefined,
    createdAt: order.createdAt.toISOString(),
    readyAt: order.readyAt?.toISOString(),
    deliveredAt: order.deliveredAt?.toISOString(),
    total,
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function listActiveOrders(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = request.user
  if (!restaurantId) return reply.code(403).send({ error: 'Acceso denegado' })

  const orders = await prisma.order.findMany({
    where: { restaurantId, status: { notIn: ['paid', 'cancelled'] } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      tableId: true,
      status: true,
      notes: true,
      createdAt: true,
      readyAt: true,
      deliveredAt: true,
      table: { select: { number: true } },
      waiter: { select: { name: true } },
      items: {
        select: {
          id: true,
          menuItemId: true,
          quantity: true,
          unitPrice: true,
          notes: true,
          menuItem: { select: { name: true } },
        },
      },
    },
  })

  return reply.send({ data: orders.map(toOrderDTO) })
}

export async function createOrder(request: FastifyRequest, reply: FastifyReply) {
  const { sub: waiterId, restaurantId } = request.user
  if (!restaurantId) return reply.code(403).send({ error: 'Acceso denegado' })

  const result = CreateOrderSchema.safeParse(request.body)
  if (!result.success) {
    return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() })
  }

  const { tableId, items, notes } = result.data

  // Verificar que la mesa pertenece al restaurante
  const table = await prisma.table.findFirst({ where: { id: tableId, restaurantId } })
  if (!table) return reply.code(404).send({ error: 'Mesa no encontrada' })

  // Verificar y capturar precios actuales de los platillos
  const menuItemIds = [...new Set(items.map((i) => i.menuItemId))]
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, restaurantId, isActive: true },
    select: { id: true, name: true, price: true, isAvailable: true },
  })

  if (menuItems.length !== menuItemIds.length) {
    return reply.code(400).send({ error: 'Uno o más platillos no existen o no están activos' })
  }

  const unavailable = menuItems.filter((m) => !m.isAvailable)
  if (unavailable.length > 0) {
    return reply.code(400).send({
      error: 'Platillos no disponibles',
      details: unavailable.map((m) => m.name),
    })
  }

  const priceMap = new Map(menuItems.map((m) => [m.id, m.price]))

  // Crear orden + items en una transacción
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        restaurantId,
        tableId,
        waiterId,
        notes,
        items: {
          create: items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: priceMap.get(item.menuItemId)!,
            notes: item.notes,
          })),
        },
      },
    })

    await tx.table.update({
      where: { id: tableId },
      data: { status: 'occupied' },
    })

    return newOrder
  })

  const orderDTO = toOrderDTO(await fetchOrderWithDetails(order.id))

  // Emitir evento a la cocina
  try {
    getIO()
      .to(`restaurant:${restaurantId}:kitchen`)
      .emit('event', { type: 'order:new', order: orderDTO })
  } catch {
    // Socket.io puede no estar inicializado en tests
  }

  return reply.code(201).send({ data: orderDTO })
}

export async function updateOrderStatus(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId, role } = request.user
  if (!restaurantId) return reply.code(403).send({ error: 'Acceso denegado' })

  const { id } = request.params as { id: string }

  const result = UpdateOrderStatusSchema.safeParse(request.body)
  if (!result.success) {
    return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() })
  }

  const { status: newStatus } = result.data

  // Verificar que la orden pertenece al restaurante
  const order = await prisma.order.findFirst({ where: { id, restaurantId } })
  if (!order) return reply.code(404).send({ error: 'Orden no encontrada' })

  // Verificar transición válida
  const allowed = VALID_TRANSITIONS[order.status] ?? []
  if (!allowed.includes(newStatus as OrderStatus)) {
    return reply.code(400).send({
      error: `No se puede cambiar de "${order.status}" a "${newStatus}"`,
    })
  }

  // Verificar permisos por rol y transición
  const canTransition =
    role === 'owner' ||
    role === 'manager' ||
    (role === 'kitchen' && ['in_progress', 'ready'].includes(newStatus)) ||
    (role === 'waiter' && ['delivered', 'cancelled'].includes(newStatus))

  if (!canTransition) {
    return reply.code(403).send({ error: 'Tu rol no puede realizar esta transición' })
  }

  // Campos adicionales según el nuevo status
  const extraFields: Record<string, unknown> = {}
  if (newStatus === 'ready') extraFields.readyAt = new Date()
  if (newStatus === 'delivered') extraFields.deliveredAt = new Date()

  const updated = await prisma.order.update({
    where: { id },
    data: { status: newStatus, ...extraFields },
  })

  // Si se entregó, liberar la mesa si no hay más órdenes activas
  if (newStatus === 'delivered') {
    const activeOrders = await prisma.order.count({
      where: {
        tableId: order.tableId,
        status: { in: ['pending', 'in_progress', 'ready'] },
      },
    })
    if (activeOrders === 0) {
      await prisma.table.update({
        where: { id: order.tableId },
        data: { status: 'available' },
      })
    }
  }

  // Emitir evento de cambio de status
  try {
    const io = getIO()
    const rooms = [
      `restaurant:${restaurantId}:kitchen`,
      `restaurant:${restaurantId}:floor`,
    ]

    if (newStatus === 'cancelled') {
      rooms.forEach((room) =>
        io.to(room).emit('event', { type: 'order:cancelled', orderId: id }),
      )
    } else {
      rooms.forEach((room) =>
        io.to(room).emit('event', { type: 'order:status_changed', orderId: id, status: newStatus }),
      )
    }
  } catch {
    // Socket.io puede no estar inicializado en tests
  }

  return reply.send({ data: { id: updated.id, status: updated.status } })
}

// ─── Agregar / cancelar items de una orden activa ────────────────────────────

export async function updateOrderItems(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = request.user
  if (!restaurantId) return reply.code(403).send({ error: 'Acceso denegado' })

  const { id } = request.params as { id: string }

  const result = UpdateOrderItemsSchema.safeParse(request.body)
  if (!result.success) {
    return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() })
  }

  const order = await prisma.order.findFirst({ where: { id, restaurantId } })
  if (!order) return reply.code(404).send({ error: 'Orden no encontrada' })

  if (!['pending', 'in_progress'].includes(order.status)) {
    return reply.code(400).send({
      error: `No se pueden modificar items en status "${order.status}"`,
    })
  }

  const { add, cancelItemId } = result.data

  if (cancelItemId) {
    // Cancelar un item: verificar que pertenece a la orden
    const item = await prisma.orderItem.findFirst({ where: { id: cancelItemId, orderId: id } })
    if (!item) return reply.code(404).send({ error: 'Item no encontrado en la orden' })

    await prisma.orderItem.delete({ where: { id: cancelItemId } })

    try {
      getIO()
        .to(`restaurant:${restaurantId}:kitchen`)
        .emit('event', { type: 'order:item_cancelled', orderId: id, itemId: cancelItemId })
    } catch { /* sin socket en tests */ }

    const updated = await fetchOrderWithDetails(id)
    return reply.send({ data: toOrderDTO(updated) })
  }

  if (add && add.length > 0) {
    // Verificar y capturar precios de los nuevos items
    const menuItemIds = [...new Set(add.map((i) => i.menuItemId))]
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, restaurantId, isActive: true },
      select: { id: true, name: true, price: true, isAvailable: true },
    })

    if (menuItems.length !== menuItemIds.length) {
      return reply.code(400).send({ error: 'Uno o más platillos no existen o no están activos' })
    }

    const priceMap = new Map(menuItems.map((m) => [m.id, m.price]))

    await prisma.orderItem.createMany({
      data: add.map((item) => ({
        orderId: id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: priceMap.get(item.menuItemId)!,
        notes: item.notes,
      })),
    })

    const updatedOrder = toOrderDTO(await fetchOrderWithDetails(id))

    try {
      getIO()
        .to(`restaurant:${restaurantId}:kitchen`)
        .emit('event', { type: 'order:updated', order: updatedOrder })
    } catch { /* sin socket en tests */ }

    return reply.send({ data: updatedOrder })
  }

  return reply.code(400).send({ error: 'Debes enviar "add" o "cancelItemId"' })
}

// ─── Registrar pago y cerrar cuenta ──────────────────────────────────────────

export async function createPayment(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = request.user
  if (!restaurantId) return reply.code(403).send({ error: 'Acceso denegado' })

  const { id } = request.params as { id: string }

  const result = CreatePaymentSchema.safeParse(request.body)
  if (!result.success) {
    return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() })
  }

  const order = await prisma.order.findFirst({
    where: { id, restaurantId },
    include: { items: true },
  })
  if (!order) return reply.code(404).send({ error: 'Orden no encontrada' })

  if (['paid', 'cancelled'].includes(order.status)) {
    return reply.code(400).send({ error: `La orden ya está en status "${order.status}"` })
  }

  // Calcular total desde items (fuente de verdad)
  const subtotal = order.items.reduce(
    (sum, item) => sum + item.unitPrice.toNumber() * item.quantity,
    0,
  )
  const total = subtotal + result.data.tip

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { status: 'paid' },
    })

    await tx.payment.create({
      data: {
        restaurantId,
        orderId: id,
        total,
        tip: result.data.tip,
        method: result.data.method,
      },
    })

    // Liberar mesa si no quedan más órdenes activas
    const activeOrders = await tx.order.count({
      where: {
        tableId: order.tableId,
        id: { not: id },
        status: { in: ['pending', 'in_progress', 'ready', 'delivered'] },
      },
    })
    if (activeOrders === 0) {
      await tx.table.update({
        where: { id: order.tableId },
        data: { status: 'available' },
      })
    }
  })

  try {
    const io = getIO()
    const rooms = [`restaurant:${restaurantId}:kitchen`, `restaurant:${restaurantId}:floor`]
    rooms.forEach((room) =>
      io.to(room).emit('event', { type: 'order:paid', orderId: id, tableId: order.tableId }),
    )
  } catch { /* sin socket en tests */ }

  return reply.code(201).send({
    data: {
      orderId: id,
      total,
      subtotal,
      tip: result.data.tip,
      method: result.data.method,
    },
  })
}

// ─── Historial de órdenes pagadas ─────────────────────────────────────────────

export async function listPaidOrders(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = request.user
  if (!restaurantId) return reply.code(403).send({ error: 'Acceso denegado' })

  const query = request.query as Record<string, string>

  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)

  const from = query.from ? new Date(query.from) : thirtyDaysAgo
  const to = query.to ? new Date(query.to) : new Date()
  to.setHours(23, 59, 59, 999)

  const page = Math.max(1, parseInt(query.page ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')))

  const where = { restaurantId, paidAt: { gte: from, lte: to } }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        order: {
          include: {
            table:  { select: { number: true } },
            waiter: { select: { name: true } },
            items: {
              select: {
                quantity: true,
                unitPrice: true,
                notes: true,
                menuItem: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ])

  const data = payments.map((p) => ({
    id: p.order.id,
    paymentId: p.id,
    tableNumber: p.order.table.number,
    waiterName: p.order.waiter.name,
    itemCount: p.order.items.reduce((sum, i) => sum + i.quantity, 0),
    items: p.order.items.map((i) => ({
      name: i.menuItem.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice.toNumber(),
      notes: i.notes ?? undefined,
    })),
    subtotal: p.total.toNumber() - p.tip.toNumber(),
    tip: p.tip.toNumber(),
    total: p.total.toNumber(),
    method: p.method as 'cash' | 'card' | 'transfer',
    paidAt: p.paidAt.toISOString(),
  }))

  return reply.send({
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}
