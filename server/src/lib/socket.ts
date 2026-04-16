import { Server } from 'socket.io'
import type { Server as HttpServer } from 'node:http'
import type { FastifyInstance } from 'fastify'

let _io: Server

export function initSocket(httpServer: HttpServer, app: FastifyInstance): Server {
  _io = new Server(httpServer, {
    cors: {
      origin:
        process.env.NODE_ENV === 'production'
          ? (process.env.FRONTEND_URL?.split(',') ?? false)
          : true,
      credentials: true,
    },
  })

  // Verificar JWT antes de aceptar la conexión
  _io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined
    if (!token) return next(new Error('No autorizado'))
    try {
      const payload = app.jwt.verify<{
        sub: string
        restaurantId: string | null
        role: string
        name: string
      }>(token)
      socket.data.user = payload
      next()
    } catch {
      next(new Error('Token inválido'))
    }
  })

  _io.on('connection', (socket) => {
    const user = socket.data.user as {
      restaurantId: string | null
      role: string
    }
    if (!user.restaurantId) return

    const rid = user.restaurantId

    // Unir automáticamente a la room según rol
    if (user.role === 'kitchen') {
      socket.join(`restaurant:${rid}:kitchen`)
    } else {
      socket.join(`restaurant:${rid}:floor`)
    }

    // Permitir unirse manualmente a ambas rooms (p.ej. admin)
    socket.on('join:kitchen', () => socket.join(`restaurant:${rid}:kitchen`))
    socket.on('join:floor', () => socket.join(`restaurant:${rid}:floor`))
  })

  return _io
}

export function getIO(): Server {
  if (!_io) throw new Error('Socket.io no inicializado')
  return _io
}
