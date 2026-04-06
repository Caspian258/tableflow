import type { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import bcrypt from 'bcryptjs'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tenantGuard(request: FastifyRequest, reply: FastifyReply): string | null {
  const { restaurantId } = request.user
  if (!restaurantId) {
    reply.code(403).send({ error: 'Acceso denegado' })
    return null
  }
  return restaurantId
}

// ─── Restaurante ─────────────────────────────────────────────────────────────

const UpdateRestaurantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones')
    .optional(),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  kitchenAlertSeconds: z.number().int().min(30).max(3600).optional(),
})

export async function getRestaurant(request: FastifyRequest, reply: FastifyReply) {
  const restaurantId = tenantGuard(request, reply)
  if (!restaurantId) return

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      address: true,
      timezone: true,
      currency: true,
      kitchenAlertSeconds: true,
      isActive: true,
      createdAt: true,
    },
  })

  if (!restaurant) return reply.code(404).send({ error: 'Restaurante no encontrado' })
  return reply.send({ data: restaurant })
}

export async function updateRestaurant(request: FastifyRequest, reply: FastifyReply) {
  const restaurantId = tenantGuard(request, reply)
  if (!restaurantId) return

  const result = UpdateRestaurantSchema.safeParse(request.body)
  if (!result.success) {
    return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() })
  }

  // Si se quiere cambiar el slug, verificar que no esté en uso
  if (result.data.slug) {
    const conflict = await prisma.restaurant.findFirst({
      where: { slug: result.data.slug, id: { not: restaurantId } },
    })
    if (conflict) return reply.code(409).send({ error: 'El slug ya está en uso' })
  }

  const updated = await prisma.restaurant.update({
    where: { id: restaurantId },
    data: result.data,
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      address: true,
      kitchenAlertSeconds: true,
    },
  })

  return reply.send({ data: updated })
}

// ─── Mesas ────────────────────────────────────────────────────────────────────

const CreateTableSchema = z.object({
  number: z.number().int().min(1),
  name: z.string().max(50).optional(),
  capacity: z.number().int().min(1).max(30).default(4),
})

const UpdateTableSchema = z.object({
  number: z.number().int().min(1).optional(),
  name: z.string().max(50).nullable().optional(),
  capacity: z.number().int().min(1).max(30).optional(),
})

export async function createTable(request: FastifyRequest, reply: FastifyReply) {
  const restaurantId = tenantGuard(request, reply)
  if (!restaurantId) return

  const result = CreateTableSchema.safeParse(request.body)
  if (!result.success) {
    return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() })
  }

  const conflict = await prisma.table.findFirst({
    where: { restaurantId, number: result.data.number },
  })
  if (conflict) return reply.code(409).send({ error: `Ya existe la mesa número ${result.data.number}` })

  const table = await prisma.table.create({
    data: { restaurantId, ...result.data },
    select: { id: true, number: true, name: true, capacity: true, status: true },
  })

  return reply.code(201).send({ data: table })
}

export async function updateTable(request: FastifyRequest, reply: FastifyReply) {
  const restaurantId = tenantGuard(request, reply)
  if (!restaurantId) return

  const { id } = request.params as { id: string }

  const result = UpdateTableSchema.safeParse(request.body)
  if (!result.success) {
    return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() })
  }

  const table = await prisma.table.findFirst({ where: { id, restaurantId } })
  if (!table) return reply.code(404).send({ error: 'Mesa no encontrada' })

  if (result.data.number !== undefined && result.data.number !== table.number) {
    const conflict = await prisma.table.findFirst({
      where: { restaurantId, number: result.data.number, id: { not: id } },
    })
    if (conflict) return reply.code(409).send({ error: `Ya existe la mesa número ${result.data.number}` })
  }

  const updated = await prisma.table.update({
    where: { id },
    data: result.data,
    select: { id: true, number: true, name: true, capacity: true, status: true },
  })

  return reply.send({ data: updated })
}

export async function deleteTable(request: FastifyRequest, reply: FastifyReply) {
  const restaurantId = tenantGuard(request, reply)
  if (!restaurantId) return

  const { id } = request.params as { id: string }

  const table = await prisma.table.findFirst({ where: { id, restaurantId } })
  if (!table) return reply.code(404).send({ error: 'Mesa no encontrada' })

  // No eliminar si tiene órdenes activas
  const activeOrders = await prisma.order.count({
    where: {
      tableId: id,
      status: { in: ['pending', 'in_progress', 'ready', 'delivered'] },
    },
  })
  if (activeOrders > 0) {
    return reply.code(409).send({ error: 'La mesa tiene órdenes activas, no se puede eliminar' })
  }

  await prisma.table.delete({ where: { id } })
  return reply.code(204).send()
}

// ─── Categorías de menú ───────────────────────────────────────────────────────

const CreateCategorySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(200).optional(),
  sortOrder: z.number().int().min(0).default(0),
})

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(200).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export async function listCategories(request: FastifyRequest, reply: FastifyReply) {
  const restaurantId = tenantGuard(request, reply)
  if (!restaurantId) return

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      sortOrder: true,
      isActive: true,
      items: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          preparationMinutes: true,
          isActive: true,
          isAvailable: true,
          sortOrder: true,
        },
      },
    },
  })

  const data = categories.map((cat) => ({
    ...cat,
    items: cat.items.map((item) => ({ ...item, price: item.price.toNumber() })),
  }))

  return reply.send({ data })
}

export async function createCategory(request: FastifyRequest, reply: FastifyReply) {
  const restaurantId = tenantGuard(request, reply)
  if (!restaurantId) return

  const result = CreateCategorySchema.safeParse(request.body)
  if (!result.success) {
    return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() })
  }

  const category = await prisma.menuCategory.create({
    data: { restaurantId, ...result.data },
    select: { id: true, name: true, description: true, sortOrder: true, isActive: true },
  })

  return reply.code(201).send({ data: category })
}

export async function updateCategory(request: FastifyRequest, reply: FastifyReply) {
  const restaurantId = tenantGuard(request, reply)
  if (!restaurantId) return

  const { id } = request.params as { id: string }

  const result = UpdateCategorySchema.safeParse(request.body)
  if (!result.success) {
    return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() })
  }

  const category = await prisma.menuCategory.findFirst({ where: { id, restaurantId } })
  if (!category) return reply.code(404).send({ error: 'Categoría no encontrada' })

  const updated = await prisma.menuCategory.update({
    where: { id },
    data: result.data,
    select: { id: true, name: true, description: true, sortOrder: true, isActive: true },
  })

  return reply.send({ data: updated })
}

export async function deleteCategory(request: FastifyRequest, reply: FastifyReply) {
  const restaurantId = tenantGuard(request, reply)
  if (!restaurantId) return

  const { id } = request.params as { id: string }

  const category = await prisma.menuCategory.findFirst({ where: { id, restaurantId } })
  if (!category) return reply.code(404).send({ error: 'Categoría no encontrada' })

  const itemCount = await prisma.menuItem.count({ where: { categoryId: id } })
  if (itemCount > 0) {
    return reply.code(409).send({
      error: `La categoría tiene ${itemCount} platillo(s). Elimínalos primero.`,
    })
  }

  await prisma.menuCategory.delete({ where: { id } })
  return reply.code(204).send()
}

// ─── Platillos ────────────────────────────────────────────────────────────────

const CreateMenuItemSchema = z.object({
  categoryId: z.string().cuid(),
  name: z.string().min(1).max(120),
  description: z.string().max(300).optional(),
  price: z.number().positive(),
  preparationMinutes: z.number().int().min(1).max(120).default(15),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
})

const UpdateMenuItemSchema = z.object({
  categoryId: z.string().cuid().optional(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(300).nullable().optional(),
  price: z.number().positive().optional(),
  preparationMinutes: z.number().int().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export async function createMenuItem(request: FastifyRequest, reply: FastifyReply) {
  const restaurantId = tenantGuard(request, reply)
  if (!restaurantId) return

  const result = CreateMenuItemSchema.safeParse(request.body)
  if (!result.success) {
    return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() })
  }

  // Verificar que la categoría pertenece al restaurante
  const category = await prisma.menuCategory.findFirst({
    where: { id: result.data.categoryId, restaurantId },
  })
  if (!category) return reply.code(404).send({ error: 'Categoría no encontrada' })

  const item = await prisma.menuItem.create({
    data: { restaurantId, ...result.data },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      preparationMinutes: true,
      isActive: true,
      isAvailable: true,
      sortOrder: true,
      categoryId: true,
    },
  })

  return reply.code(201).send({ data: { ...item, price: item.price.toNumber() } })
}

export async function updateMenuItem(request: FastifyRequest, reply: FastifyReply) {
  const restaurantId = tenantGuard(request, reply)
  if (!restaurantId) return

  const { id } = request.params as { id: string }

  const result = UpdateMenuItemSchema.safeParse(request.body)
  if (!result.success) {
    return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() })
  }

  const item = await prisma.menuItem.findFirst({ where: { id, restaurantId } })
  if (!item) return reply.code(404).send({ error: 'Platillo no encontrado' })

  if (result.data.categoryId) {
    const category = await prisma.menuCategory.findFirst({
      where: { id: result.data.categoryId, restaurantId },
    })
    if (!category) return reply.code(404).send({ error: 'Categoría no encontrada' })
  }

  const updated = await prisma.menuItem.update({
    where: { id },
    data: result.data,
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      preparationMinutes: true,
      isActive: true,
      isAvailable: true,
      sortOrder: true,
      categoryId: true,
    },
  })

  return reply.send({ data: { ...updated, price: updated.price.toNumber() } })
}

export async function deleteMenuItem(request: FastifyRequest, reply: FastifyReply) {
  const restaurantId = tenantGuard(request, reply)
  if (!restaurantId) return

  const { id } = request.params as { id: string }

  const item = await prisma.menuItem.findFirst({ where: { id, restaurantId } })
  if (!item) return reply.code(404).send({ error: 'Platillo no encontrado' })

  await prisma.menuItem.delete({ where: { id } })
  return reply.code(204).send()
}

// ─── Personal ─────────────────────────────────────────────────────────────────

const CreateStaffSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(['manager', 'waiter', 'kitchen']),
  pin: z
    .string()
    .regex(/^\d{4}$/, 'El PIN debe ser de 4 dígitos')
    .optional(),
})

export async function listStaff(request: FastifyRequest, reply: FastifyReply) {
  const restaurantId = tenantGuard(request, reply)
  if (!restaurantId) return

  const staff = await prisma.user.findMany({
    where: { restaurantId },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      pin: true,
      isActive: true,
      createdAt: true,
    },
  })

  return reply.send({ data: staff })
}

export async function createStaff(request: FastifyRequest, reply: FastifyReply) {
  const restaurantId = tenantGuard(request, reply)
  if (!restaurantId) return

  const result = CreateStaffSchema.safeParse(request.body)
  if (!result.success) {
    return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() })
  }

  const existing = await prisma.user.findFirst({ where: { email: result.data.email } })
  if (existing) return reply.code(409).send({ error: 'El email ya está en uso' })

  const passwordHash = await bcrypt.hash(result.data.password, 10)

  const user = await prisma.user.create({
    data: {
      restaurantId,
      name: result.data.name,
      email: result.data.email,
      passwordHash,
      role: result.data.role,
      pin: result.data.pin,
    },
    select: { id: true, name: true, email: true, role: true, pin: true, isActive: true, createdAt: true },
  })

  return reply.code(201).send({ data: user })
}

export async function toggleStaffActive(request: FastifyRequest, reply: FastifyReply) {
  const restaurantId = tenantGuard(request, reply)
  if (!restaurantId) return

  const { id } = request.params as { id: string }

  const user = await prisma.user.findFirst({ where: { id, restaurantId } })
  if (!user) return reply.code(404).send({ error: 'Usuario no encontrado' })

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
    select: { id: true, name: true, email: true, role: true, pin: true, isActive: true, createdAt: true },
  })

  return reply.send({ data: updated })
}

export async function resetStaffPin(request: FastifyRequest, reply: FastifyReply) {
  const restaurantId = tenantGuard(request, reply)
  if (!restaurantId) return

  const { id } = request.params as { id: string }

  const PinSchema = z.object({ pin: z.string().regex(/^\d{4}$/, 'El PIN debe ser de 4 dígitos') })
  const result = PinSchema.safeParse(request.body)
  if (!result.success) {
    return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() })
  }

  const user = await prisma.user.findFirst({ where: { id, restaurantId } })
  if (!user) return reply.code(404).send({ error: 'Usuario no encontrado' })

  const updated = await prisma.user.update({
    where: { id },
    data: { pin: result.data.pin },
    select: { id: true, name: true, email: true, role: true, pin: true, isActive: true },
  })

  return reply.send({ data: updated })
}

// ─── Progreso de onboarding ───────────────────────────────────────────────────

export async function getOnboardingStatus(request: FastifyRequest, reply: FastifyReply) {
  const restaurantId = tenantGuard(request, reply)
  if (!restaurantId) return

  const [tableCount, categoryCount, staffCount] = await Promise.all([
    prisma.table.count({ where: { restaurantId } }),
    prisma.menuCategory.count({ where: { restaurantId, isActive: true } }),
    prisma.user.count({ where: { restaurantId, role: { in: ['waiter', 'kitchen', 'manager'] } } }),
  ])

  return reply.send({
    data: {
      hasTables: tableCount > 0,
      hasMenu: categoryCount > 0,
      hasStaff: staffCount > 0,
      isComplete: tableCount > 0 && categoryCount > 0 && staffCount > 0,
    },
  })
}
