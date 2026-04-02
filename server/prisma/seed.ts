import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed...')

  // Verificar si ya existe data para no duplicar
  const existing = await prisma.restaurant.findUnique({ where: { slug: 'el-piloto' } })
  if (existing) {
    console.log('Ya existe data de prueba. Ejecuta "pnpm db:reset" si quieres recrearla.')
    return
  }

  // ─── Restaurante ───────────────────────────────────────────────────────────

  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'El Piloto',
      slug: 'el-piloto',
      address: 'Av. Principal 123, Col. Centro',
      phone: '555-1234-5678',
      timezone: 'America/Mexico_City',
      currency: 'MXN',
      kitchenAlertSeconds: 600,
    },
  })

  console.log(`Restaurante creado: ${restaurant.name} (${restaurant.id})`)

  // ─── Suscripción trial ─────────────────────────────────────────────────────

  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 30)

  await prisma.subscription.create({
    data: {
      restaurantId: restaurant.id,
      plan: 'trial',
      status: 'trialing',
      currentPeriodEnd: trialEnd,
    },
  })

  // ─── Usuarios ──────────────────────────────────────────────────────────────

  const hash = (pwd: string) => bcrypt.hash(pwd, 12)

  await Promise.all([
    prisma.user.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Carlos Rodríguez',
        email: 'owner@elpiloto.com',
        passwordHash: await hash('owner1234'),
        role: 'owner',
      },
    }),
    prisma.user.create({
      data: {
        restaurantId: restaurant.id,
        name: 'María López',
        email: 'manager@elpiloto.com',
        passwordHash: await hash('manager1234'),
        role: 'manager',
      },
    }),
    prisma.user.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Juan García',
        email: 'mesero1@elpiloto.com',
        passwordHash: await hash('waiter1234'),
        pin: '1234',
        role: 'waiter',
      },
    }),
    prisma.user.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Ana Martínez',
        email: 'mesero2@elpiloto.com',
        passwordHash: await hash('waiter5678'),
        pin: '5678',
        role: 'waiter',
      },
    }),
    prisma.user.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Pedro Sánchez',
        email: 'cocina@elpiloto.com',
        passwordHash: await hash('kitchen1234'),
        pin: '9012',
        role: 'kitchen',
      },
    }),
  ])

  console.log('Usuarios creados: owner, manager, 2 meseros, 1 cocina')

  // ─── Mesas ─────────────────────────────────────────────────────────────────

  await prisma.table.createMany({
    data: [
      { restaurantId: restaurant.id, number: 1, name: 'Mesa 1', capacity: 4 },
      { restaurantId: restaurant.id, number: 2, name: 'Mesa 2', capacity: 4 },
      { restaurantId: restaurant.id, number: 3, name: 'Mesa 3', capacity: 6 },
      { restaurantId: restaurant.id, number: 4, name: 'Terraza 1', capacity: 4 },
      { restaurantId: restaurant.id, number: 5, name: 'Terraza 2', capacity: 2 },
    ],
  })

  console.log('Mesas creadas: 5')

  // ─── Menú ──────────────────────────────────────────────────────────────────

  const [entradas, platillos, bebidas, postres] = await Promise.all([
    prisma.menuCategory.create({
      data: { restaurantId: restaurant.id, name: 'Entradas', sortOrder: 1 },
    }),
    prisma.menuCategory.create({
      data: { restaurantId: restaurant.id, name: 'Platos Fuertes', sortOrder: 2 },
    }),
    prisma.menuCategory.create({
      data: { restaurantId: restaurant.id, name: 'Bebidas', sortOrder: 3 },
    }),
    prisma.menuCategory.create({
      data: { restaurantId: restaurant.id, name: 'Postres', sortOrder: 4 },
    }),
  ])

  await prisma.menuItem.createMany({
    data: [
      // Entradas
      {
        restaurantId: restaurant.id,
        categoryId: entradas.id,
        name: 'Guacamole con totopos',
        description: 'Aguacate, jitomate, cebolla, cilantro y limón',
        price: 85,
        preparationMinutes: 5,
        sortOrder: 1,
      },
      {
        restaurantId: restaurant.id,
        categoryId: entradas.id,
        name: 'Quesadillas de flor de calabaza',
        description: 'Tortilla de maíz, quesillo y flor de calabaza',
        price: 95,
        preparationMinutes: 10,
        sortOrder: 2,
      },
      {
        restaurantId: restaurant.id,
        categoryId: entradas.id,
        name: 'Sopa de lima',
        description: 'Caldo de pollo, tiras de tortilla, lima y aguacate',
        price: 90,
        preparationMinutes: 8,
        sortOrder: 3,
      },
      // Platos fuertes
      {
        restaurantId: restaurant.id,
        categoryId: platillos.id,
        name: 'Enchiladas verdes',
        description: 'Tortillas bañadas en salsa verde con pollo, crema y queso',
        price: 145,
        preparationMinutes: 15,
        sortOrder: 1,
      },
      {
        restaurantId: restaurant.id,
        categoryId: platillos.id,
        name: 'Chiles en nogada',
        description: 'Chile poblano relleno de picadillo, nogada y granada',
        price: 185,
        preparationMinutes: 20,
        sortOrder: 2,
      },
      {
        restaurantId: restaurant.id,
        categoryId: platillos.id,
        name: 'Tacos de carnitas (3 piezas)',
        description: 'Tortilla de maíz, carnitas, cebolla, cilantro y salsa',
        price: 125,
        preparationMinutes: 10,
        sortOrder: 3,
      },
      {
        restaurantId: restaurant.id,
        categoryId: platillos.id,
        name: 'Pozole rojo',
        description: 'Caldo rojo con maíz cacahuazintle y carne de cerdo',
        price: 155,
        preparationMinutes: 12,
        sortOrder: 4,
      },
      // Bebidas
      {
        restaurantId: restaurant.id,
        categoryId: bebidas.id,
        name: 'Agua de horchata',
        description: 'Agua fresca de arroz con canela',
        price: 45,
        preparationMinutes: 2,
        sortOrder: 1,
      },
      {
        restaurantId: restaurant.id,
        categoryId: bebidas.id,
        name: 'Jamaica',
        description: 'Agua fresca de flor de jamaica',
        price: 45,
        preparationMinutes: 2,
        sortOrder: 2,
      },
      {
        restaurantId: restaurant.id,
        categoryId: bebidas.id,
        name: 'Michelada',
        description: 'Cerveza con limón, sal y chamoy',
        price: 85,
        preparationMinutes: 3,
        sortOrder: 3,
      },
      {
        restaurantId: restaurant.id,
        categoryId: bebidas.id,
        name: 'Refresco',
        description: 'Coca-Cola, Sprite o Fanta',
        price: 40,
        preparationMinutes: 1,
        sortOrder: 4,
      },
      // Postres
      {
        restaurantId: restaurant.id,
        categoryId: postres.id,
        name: 'Flan napolitano',
        description: 'Flan casero con cajeta y nuez',
        price: 75,
        preparationMinutes: 5,
        sortOrder: 1,
      },
      {
        restaurantId: restaurant.id,
        categoryId: postres.id,
        name: 'Churros con chocolate',
        description: 'Churros fritos con azúcar y salsa de chocolate',
        price: 65,
        preparationMinutes: 8,
        sortOrder: 2,
      },
    ],
  })

  console.log('Menú creado: 4 categorías, 13 platillos')
  console.log('\n--- Credenciales de prueba ---')
  console.log('Owner:   owner@elpiloto.com     / owner1234')
  console.log('Manager: manager@elpiloto.com   / manager1234')
  console.log('Mesero1: mesero1@elpiloto.com   / waiter1234  (PIN: 1234)')
  console.log('Mesero2: mesero2@elpiloto.com   / waiter5678  (PIN: 5678)')
  console.log('Cocina:  cocina@elpiloto.com    / kitchen1234 (PIN: 9012)')
  console.log('\nSeed completado exitosamente.')
}

main()
  .catch((err) => {
    console.error('Error en seed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
