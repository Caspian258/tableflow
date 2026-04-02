import type { FastifyRequest, FastifyReply } from 'fastify'
import type { UserRole } from '@tableflow/shared'

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'No autorizado' })
  }
}

export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.code(401).send({ error: 'No autorizado' })
    }
    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({ error: 'Acceso denegado' })
    }
  }
}
