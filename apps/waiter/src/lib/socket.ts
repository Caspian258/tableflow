import { io, type Socket } from 'socket.io-client'
import type { SocketEvent } from '@tableflow/shared'
import { useAppStore } from '../store/index'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

let socket: Socket | null = null

export function connectSocket(token: string): Socket {
  if (socket?.connected) socket.disconnect()

  socket = io(BASE_URL, {
    auth: { token },
    reconnectionAttempts: 5,
    reconnectionDelay: 1500,
  })

  socket.on('connect', () => {
    console.log('[socket] conectado')
  })

  socket.on('disconnect', (reason) => {
    console.log('[socket] desconectado:', reason)
  })

  socket.on('event', (event: SocketEvent) => {
    const store = useAppStore.getState()

    switch (event.type) {
      case 'order:new':
        store.upsertOrder(event.order)
        break

      case 'order:status_changed':
        store.updateOrderStatus(event.orderId, event.status)
        // Si la orden se entregó, actualizar tabla
        if (event.status === 'delivered') {
          const order = store.orders.find((o) => o.id === event.orderId)
          if (order) store.updateTableStatus(order.tableId, 'available')
        }
        break

      case 'order:cancelled':
        store.removeOrder(event.orderId)
        break

      case 'table:status_changed':
        store.updateTableStatus(event.tableId, event.status)
        break
    }
  })

  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
