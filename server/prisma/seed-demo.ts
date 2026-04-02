/**
 * Seed de datos de analytics para demo.
 * Genera ~30 días de historial de órdenes entregadas.
 * Corre SOLO si ya existe el restaurante "el-piloto".
 *
 * Uso: pnpm --filter server tsx prisma/seed-demo.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(Math.floor(Math.random() * 14) + 9, Math.floor(Math.random() * 60), 0, 0)
  return d
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function main() {
  const restaurant = await prisma.restaurant.findUnique({ where: { slug: 'el-piloto' } })
  if (!restaurant) {
    console.error('Restaurante el-piloto no encontrado. Corre pnpm db:seed primero.')
    return
  }

  const tables = await prisma.table.findMany({ where: { restaurantId: restaurant.id } })
  const waiters = await prisma.user.findMany({
    where: { restaurantId: restaurant.id, role: 'waiter' },
  })
  const items = await prisma.menuItem.findMany({
    where: { restaurantId: restaurant.id, isActive: true },
  })

  if (!tables.length || !waiters.length || !items.length) {
    console.error('Faltan tablas, meseros o platillos. Corre pnpm db:seed primero.')
    return
  }

  console.log('Generando datos demo de analytics (30 días)...')

  let created = 0
  for (let day = 30; day >= 0; day--) {
    // Entre 3 y 12 órdenes por día
    const ordersPerDay = Math.floor(Math.random() * 10) + 3

    for (let i = 0; i < ordersPerDay; i++) {
      const createdAt = daysAgo(day)
      const readyAt = new Date(createdAt.getTime() + (Math.random() * 20 + 5) * 60 * 1000)
      const deliveredAt = new Date(readyAt.getTime() + (Math.random() * 5 + 1) * 60 * 1000)
      const table = pick(tables)
      const waiter = pick(waiters)

      // Entre 1 y 4 items por orden
      const numItems = Math.floor(Math.random() * 4) + 1
      const selectedItems = [...items].sort(() => Math.random() - 0.5).slice(0, numItems)

      await prisma.order.create({
        data: {
          restaurantId: restaurant.id,
          tableId: table.id,
          waiterId: waiter.id,
          status: 'delivered',
          createdAt,
          readyAt,
          deliveredAt,
          updatedAt: deliveredAt,
          items: {
            create: selectedItems.map((item) => ({
              menuItemId: item.id,
              quantity: Math.floor(Math.random() * 3) + 1,
              unitPrice: item.price,
            })),
          },
        },
      })
      created++
    }
  }

  console.log(`✓ ${created} órdenes de demo creadas.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
