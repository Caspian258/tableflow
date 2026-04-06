import { io, type Socket } from 'socket.io-client'
import type { SocketEvent } from '@tableflow/shared'
import { useKitchenStore } from '../store/index'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

let socket: Socket | null = null

export function connectSocket(token: string): Socket {
  if (socket?.connected) socket.disconnect()

  socket = io(BASE_URL, {
    auth: { token },
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  })

  socket.on('connect', () => console.log('[kds] socket conectado'))
  socket.on('disconnect', (r) => console.log('[kds] socket desconectado:', r))

  socket.on('event', (event: SocketEvent) => {
    const store = useKitchenStore.getState()

    switch (event.type) {
      case 'order:new':
        // Solo mostrar órdenes activas para cocina
        if (event.order.status === 'pending' || event.order.status === 'in_progress') {
          store.upsertOrder(event.order)
        }
        break

      case 'order:status_changed':
        if (event.status === 'delivered' || event.status === 'paid' || event.status === 'cancelled') {
          store.removeOrder(event.orderId)
        } else {
          store.updateOrderStatus(event.orderId, event.status)
        }
        break

      case 'order:cancelled':
        store.removeOrder(event.orderId)
        break

      case 'order:updated':
        // Actualizar la orden y marcar los items nuevos para highlight
        if (event.order.status === 'pending' || event.order.status === 'in_progress') {
          store.upsertOrderWithNewItems(event.order)
        }
        break

      case 'order:item_cancelled':
        store.markItemCancelled(event.orderId, event.itemId)
        break

      case 'order:paid':
        store.removeOrder(event.orderId)
        break
    }
  })

  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
