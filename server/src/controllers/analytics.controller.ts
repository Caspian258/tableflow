import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDateRange(query: Record<string, unknown>) {
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)

  const from = query.from ? new Date(query.from as string) : thirtyDaysAgo
  const to = query.to ? new Date(query.to as string) : new Date()
  to.setHours(23, 59, 59, 999)

  return { from, to }
}

function toDay(d: Date) {
  return d.toISOString().slice(0, 10)
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return Math.round(sorted[Math.max(0, idx)] * 10) / 10
}

const RESTAURANT_TZ = process.env.TZ_RESTAURANT ?? 'America/Mexico_City'

/** Extrae la hora (0-23) de una fecha UTC convirtiéndola a la zona horaria del restaurante. */
function getLocalHour(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: RESTAURANT_TZ,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date)
  const h = parts.find((p) => p.type === 'hour')
  // Intl puede devolver '24' para la medianoche en algunos entornos — normalizar con % 24
  return h ? parseInt(h.value, 10) % 24 : 0
}

// ─── GET /analytics/sales ─────────────────────────────────────────────────────

export async function getSales(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = request.user
  if (!restaurantId) return reply.code(403).send({ error: 'Acceso denegado' })

  const { from, to } = parseDateRange(request.query as Record<string, unknown>)

  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      status: { in: ['delivered', 'paid'] },
      createdAt: { gte: from, lte: to },
    },
    select: {
      createdAt: true,
      items: { select: { quantity: true, unitPrice: true } },
    },
  })

  // Agrupar por día
  const dayMap = new Map<string, { revenue: number; orders: number }>()

  let totalRevenue = 0
  for (const order of orders) {
    const day = toDay(order.createdAt)
    const orderTotal = order.items.reduce(
      (s, i) => s + i.unitPrice.toNumber() * i.quantity,
      0,
    )
    totalRevenue += orderTotal
    const prev = dayMap.get(day) ?? { revenue: 0, orders: 0 }
    dayMap.set(day, { revenue: prev.revenue + orderTotal, orders: prev.orders + 1 })
  }

  // Rellenar todos los días del rango con 0 si no tienen datos
  const byDay: Array<{ date: string; revenue: number; orders: number }> = []
  const cursor = new Date(from)
  while (cursor <= to) {
    const day = toDay(cursor)
    const entry = dayMap.get(day) ?? { revenue: 0, orders: 0 }
    byDay.push({ date: day, ...entry })
    cursor.setDate(cursor.getDate() + 1)
  }

  const totalOrders = orders.length
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0

  return reply.send({
    data: {
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        avgTicket: Math.round(avgTicket * 100) / 100,
      },
      byDay,
    },
  })
}

// ─── GET /analytics/top-items ─────────────────────────────────────────────────

export async function getTopItems(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = request.user
  if (!restaurantId) return reply.code(403).send({ error: 'Acceso denegado' })

  const { from, to } = parseDateRange(request.query as Record<string, unknown>)

  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        restaurantId,
        status: { in: ['delivered', 'paid'] },
        createdAt: { gte: from, lte: to },
      },
    },
    select: {
      quantity: true,
      unitPrice: true,
      menuItem: { select: { id: true, name: true } },
    },
  })

  // Agrupar por platillo
  const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>()
  for (const item of orderItems) {
    const key = item.menuItem.id
    const prev = itemMap.get(key) ?? { name: item.menuItem.name, quantity: 0, revenue: 0 }
    itemMap.set(key, {
      name: prev.name,
      quantity: prev.quantity + item.quantity,
      revenue: prev.revenue + item.unitPrice.toNumber() * item.quantity,
    })
  }

  const ranked = Array.from(itemMap.entries())
    .map(([menuItemId, v]) => ({ menuItemId, ...v }))
    .sort((a, b) => b.quantity - a.quantity)
    .map((item, i) => ({
      rank: i + 1,
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      revenue: Math.round(item.revenue * 100) / 100,
    }))

  return reply.send({ data: ranked })
}

// ─── GET /analytics/peak-hours ────────────────────────────────────────────────

export async function getPeakHours(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = request.user
  if (!restaurantId) return reply.code(403).send({ error: 'Acceso denegado' })

  const { from, to } = parseDateRange(request.query as Record<string, unknown>)

  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      status: { in: ['delivered', 'paid'] },
      createdAt: { gte: from, lte: to },
    },
    select: { createdAt: true },
  })

  const byHour = new Array(24).fill(0) as number[]
  for (const order of orders) {
    byHour[getLocalHour(order.createdAt)]++
  }

  const data = byHour.map((orders, hour) => ({ hour, orders }))

  return reply.send({ data })
}

// ─── GET /analytics/prep-times ────────────────────────────────────────────────

export async function getPrepTimes(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = request.user
  if (!restaurantId) return reply.code(403).send({ error: 'Acceso denegado' })

  const { from, to } = parseDateRange(request.query as Record<string, unknown>)

  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      readyAt: { not: null },
      createdAt: { gte: from, lte: to },
    },
    select: { createdAt: true, readyAt: true },
  })

  const minutes = orders
    .filter((o) => o.readyAt !== null)
    .map((o) => (o.readyAt!.getTime() - o.createdAt.getTime()) / 60000)
    .sort((a, b) => a - b)

  const sampleSize = minutes.length
  const averageMinutes =
    sampleSize > 0
      ? Math.round((minutes.reduce((s, m) => s + m, 0) / sampleSize) * 10) / 10
      : 0

  return reply.send({
    data: {
      averageMinutes,
      p50Minutes: percentile(minutes, 50),
      p90Minutes: percentile(minutes, 90),
      sampleSize,
    },
  })
}
