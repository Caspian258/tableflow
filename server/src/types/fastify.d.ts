import type { UserRole } from '@tableflow/shared'

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string
      restaurantId: string | null
      role: UserRole
      name: string
    }
    user: {
      sub: string
      restaurantId: string | null
      role: UserRole
      name: string
    }
  }
}
