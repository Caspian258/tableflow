import type { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { prisma } from '../lib/prisma.js'

const RegisterSchema = z.object({
  restaurantName: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  ownerName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const result = RegisterSchema.safeParse(request.body)
  if (!result.success) {
    return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() })
  }

  const { restaurantName, slug, ownerName, email, password } = result.data

  // Verificar unicidad antes de la transacción para dar error claro
  const [existingSlug, existingEmail] = await Promise.all([
    prisma.restaurant.findUnique({ where: { slug } }),
    prisma.user.findUnique({ where: { email } }),
  ])

  if (existingSlug) {
    return reply.code(409).send({ error: 'El slug ya está en uso' })
  }
  if (existingEmail) {
    return reply.code(409).send({ error: 'El correo ya está registrado' })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 30)

  // Transacción: restaurant + user + subscription
  const { restaurant, user } = await prisma.$transaction(async (tx) => {
    const restaurant = await tx.restaurant.create({
      data: { name: restaurantName, slug },
    })

    const user = await tx.user.create({
      data: {
        restaurantId: restaurant.id,
        name: ownerName,
        email,
        passwordHash,
        role: 'owner',
      },
    })

    await tx.subscription.create({
      data: {
        restaurantId: restaurant.id,
        plan: 'trial',
        status: 'trialing',
        currentPeriodEnd: trialEnd,
      },
    })

    return { restaurant, user }
  })

  // Login automático: generar tokens
  const accessToken = await reply.jwtSign({
    sub: user.id,
    restaurantId: user.restaurantId,
    role: user.role,
    name: user.name,
  })

  const rawToken = crypto.randomBytes(64).toString('hex')
  const refreshExpiresAt = new Date()
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + REFRESH_EXPIRES_DAYS)

  await prisma.refreshToken.create({
    data: { userId: user.id, token: rawToken, expiresAt: refreshExpiresAt },
  })

  reply.setCookie(REFRESH_TOKEN_COOKIE, rawToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/auth',
    expires: refreshExpiresAt,
  })

  return reply.code(201).send({
    data: {
      accessToken,
      user: {
        id: user.id,
        restaurantId: user.restaurantId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
      },
      trialEndsAt: trialEnd.toISOString(),
    },
  })
}

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const REFRESH_TOKEN_COOKIE = 'refresh_token'
const REFRESH_EXPIRES_DAYS = 7
const isProd = process.env.NODE_ENV === 'production'

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const result = LoginSchema.safeParse(request.body)
  if (!result.success) {
    return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() })
  }

  const { email, password } = result.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.isActive) {
    return reply.code(401).send({ error: 'Credenciales incorrectas' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return reply.code(401).send({ error: 'Credenciales incorrectas' })
  }

  const accessToken = await reply.jwtSign({
    sub: user.id,
    restaurantId: user.restaurantId,
    role: user.role,
    name: user.name,
  })

  const rawToken = crypto.randomBytes(64).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS)

  await prisma.refreshToken.create({
    data: { userId: user.id, token: rawToken, expiresAt },
  })

  reply.setCookie(REFRESH_TOKEN_COOKIE, rawToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/auth',
    expires: expiresAt,
  })

  return reply.send({
    data: {
      accessToken,
      user: {
        id: user.id,
        restaurantId: user.restaurantId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  })
}

const PinLoginSchema = z.object({
  pin: z.string().length(4).regex(/^\d{4}$/),
  restaurantSlug: z.string().min(1),
})

export async function loginWithPin(request: FastifyRequest, reply: FastifyReply) {
  const result = PinLoginSchema.safeParse(request.body)
  if (!result.success) {
    return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() })
  }

  const { pin, restaurantSlug } = result.data

  const user = await prisma.user.findFirst({
    where: {
      pin,
      isActive: true,
      restaurant: { slug: restaurantSlug },
    },
    include: {
      restaurant: { select: { kitchenAlertSeconds: true } },
    },
  })

  if (!user || !user.restaurant) {
    return reply.code(401).send({ error: 'PIN incorrecto' })
  }

  const accessToken = await reply.jwtSign({
    sub: user.id,
    restaurantId: user.restaurantId,
    role: user.role,
    name: user.name,
  })

  const rawToken = crypto.randomBytes(64).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS)

  await prisma.refreshToken.create({
    data: { userId: user.id, token: rawToken, expiresAt },
  })

  reply.setCookie(REFRESH_TOKEN_COOKIE, rawToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/auth',
    expires: expiresAt,
  })

  return reply.send({
    data: {
      accessToken,
      kitchenAlertSeconds: user.restaurant.kitchenAlertSeconds,
      user: {
        id: user.id,
        restaurantId: user.restaurantId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  })
}

export async function refresh(request: FastifyRequest, reply: FastifyReply) {
  const rawToken = request.cookies[REFRESH_TOKEN_COOKIE]
  if (!rawToken) {
    return reply.code(401).send({ error: 'Refresh token no encontrado' })
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: rawToken },
    include: { user: true },
  })

  if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
    return reply.code(401).send({ error: 'Refresh token inválido o expirado' })
  }

  const accessToken = await reply.jwtSign({
    sub: stored.user.id,
    restaurantId: stored.user.restaurantId,
    role: stored.user.role,
    name: stored.user.name,
  })

  return reply.send({ data: { accessToken } })
}

export async function logout(request: FastifyRequest, reply: FastifyReply) {
  const rawToken = request.cookies[REFRESH_TOKEN_COOKIE]
  if (rawToken) {
    await prisma.refreshToken.deleteMany({ where: { token: rawToken } })
  }
  reply.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/auth' })
  return reply.send({ data: { ok: true } })
}
