import { io, type Socket } from 'socket.io-client'
import type { OrderDTO, SocketEvent } from '@tableflow/shared'
import { useKitchenStore } from '../store/index'
import { api } from './api'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

let socket: Socket | null = null

export function connectSocket(): Socket {
  if (socket?.connected) return socket
  if (socket) socket.disconnect()

  socket = io(BASE_URL, {
    // Callback dinámico: cada intento de reconexión obtiene el token actual del store
    auth: (cb: (data: { token: string | null }) => void) =>
      cb({ token: useKitchenStore.getState().accessToken }),
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  })

  socket.on('connect', () => console.log('[kds] socket conectado'))
  socket.on('disconnect', (r) => console.log('[kds] socket desconectado:', r))

  // Al reconectar: recargar órdenes activas para no perderse cambios mientras estuvo offline
  socket.io.on('reconnect', () => {
    console.log('[kds] socket reconectado — recargando órdenes')
    api
      .get<{ data: OrderDTO[] }>('/orders')
      .then((res) => {
        const active = res.data.filter(
          (o) => o.status === 'pending' || o.status === 'in_progress' || o.status === 'ready',
        )
        useKitchenStore.getState().setOrders(active)
      })
      .catch((err: unknown) => console.error('[kds] error recargando órdenes:', err))
  })

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
