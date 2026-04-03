import type { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { stripe } from '../lib/stripe.js'
import { prisma } from '../lib/prisma.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLAN_PRICES: Record<string, string | undefined> = {
  basic: process.env.STRIPE_BASIC_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID,
}

function daysRemaining(date: Date | null) {
  if (!date) return null
  const diff = date.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

// ─── GET /billing/status ──────────────────────────────────────────────────────

export async function getBillingStatus(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = request.user

  const sub = await prisma.subscription.findUnique({ where: { restaurantId: restaurantId! } })

  if (!sub) {
    return reply.send({
      data: { plan: 'trial', status: 'trialing', trialDaysRemaining: null, currentPeriodEnd: null },
    })
  }

  return reply.send({
    data: {
      plan: sub.plan,
      status: sub.status,
      trialDaysRemaining: sub.status === 'trialing' ? daysRemaining(sub.currentPeriodEnd) : null,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    },
  })
}

// ─── POST /billing/create-checkout ───────────────────────────────────────────

const CheckoutSchema = z.object({
  plan: z.enum(['basic', 'pro']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

export async function createCheckout(request: FastifyRequest, reply: FastifyReply) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return reply.code(503).send({ error: 'Billing no configurado' })
  }

  const result = CheckoutSchema.safeParse(request.body)
  if (!result.success) {
    return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() })
  }

  const { plan, successUrl, cancelUrl } = result.data
  const priceId = PLAN_PRICES[plan]

  if (!priceId) {
    return reply.code(503).send({ error: `Precio para plan "${plan}" no configurado` })
  }

  const { restaurantId } = request.user

  const sub = await prisma.subscription.findUnique({ where: { restaurantId: restaurantId! } })

  // Obtener o crear el customer de Stripe
  let stripeCustomerId = sub?.stripeCustomerId ?? null

  if (!stripeCustomerId) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId! } })
    const owner = await prisma.user.findFirst({
      where: { restaurantId: restaurantId!, role: 'owner' },
    })

    const customer = await stripe.customers.create({
      name: restaurant?.name,
      email: owner?.email,
      metadata: { restaurantId: restaurantId! },
    })

    stripeCustomerId = customer.id

    if (sub) {
      await prisma.subscription.update({
        where: { restaurantId: restaurantId! },
        data: { stripeCustomerId },
      })
    }
  }

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { restaurantId: restaurantId! },
    subscription_data: {
      metadata: { restaurantId: restaurantId! },
    },
  })

  return reply.send({ data: { url: session.url } })
}

// ─── POST /billing/webhook ────────────────────────────────────────────────────

export async function handleWebhook(request: FastifyRequest, reply: FastifyReply) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return reply.code(503).send({ error: 'Webhook secret no configurado' })
  }

  const sig = request.headers['stripe-signature'] as string
  let event

  try {
    // request.rawBody es el body sin parsear (capturado en el content type parser)
    event = stripe.webhooks.constructEvent(
      request.rawBody!,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (err) {
    return reply.code(400).send({ error: `Webhook inválido: ${String(err)}` })
  }

  try {
    await handleStripeEvent(event)
  } catch (err) {
    request.log.error(err, 'Error procesando webhook de Stripe')
    return reply.code(500).send({ error: 'Error interno procesando evento' })
  }

  return reply.send({ received: true })
}

async function handleStripeEvent(event: import('stripe').Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as import('stripe').Stripe.Checkout.Session
      const restaurantId = session.metadata?.restaurantId
      if (!restaurantId || !session.subscription) break

      const stripeSubId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id

      const stripeSub = await stripe.subscriptions.retrieve(stripeSubId)
      const priceId = stripeSub.items.data[0]?.price.id

      const plan = priceId === process.env.STRIPE_BASIC_PRICE_ID ? 'basic' : 'pro'

      // In API 2026-03-25.dahlia, use trial_end for trial period end
      // For billing period end, it will be set on invoice.paid
      await prisma.subscription.upsert({
        where: { restaurantId },
        create: {
          restaurantId,
          plan,
          status: 'active',
          stripeCustomerId: stripeSub.customer as string,
          stripePriceId: priceId,
        },
        update: {
          plan,
          status: 'active',
          stripeCustomerId: stripeSub.customer as string,
          stripePriceId: priceId,
        },
      })
      break
    }

    case 'invoice.paid': {
      // In API 2026-03-25.dahlia, Invoice has period_end directly
      const invoice = event.data.object as import('stripe').Stripe.Invoice
      const stripeCustomerId = invoice.customer as string

      const sub = await prisma.subscription.findFirst({ where: { stripeCustomerId } })
      if (!sub) break

      await prisma.subscription.update({
        where: { restaurantId: sub.restaurantId },
        data: {
          status: 'active',
          // invoice.period_end is the Unix timestamp for when this billing period ends
          currentPeriodEnd: new Date(invoice.period_end * 1000),
        },
      })
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as import('stripe').Stripe.Invoice
      const stripeCustomerId = invoice.customer as string

      const sub = await prisma.subscription.findFirst({ where: { stripeCustomerId } })
      if (!sub) break

      await prisma.subscription.update({
        where: { restaurantId: sub.restaurantId },
        data: { status: 'past_due' },
      })
      break
    }

    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object as import('stripe').Stripe.Subscription
      const stripeCustomerId = stripeSub.customer as string

      const sub = await prisma.subscription.findFirst({ where: { stripeCustomerId } })
      if (!sub) break

      await prisma.subscription.update({
        where: { restaurantId: sub.restaurantId },
        data: { status: 'cancelled' },
      })
      break
    }
  }
}
