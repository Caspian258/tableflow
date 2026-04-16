import { io, type Socket } from 'socket.io-client'
import type { TableDTO, OrderDTO, SocketEvent } from '@tableflow/shared'
import { useAppStore } from '../store/index'
import { api } from './api'

const BASE_URL =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) ??
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3001'

let socket: Socket | null = null

export function connectSocket(): Socket {
  if (socket?.connected) return socket
  if (socket) socket.disconnect()

  socket = io(BASE_URL, {
    // Callback dinámico: cada intento de reconexión obtiene el token actual del store
    auth: (cb: (data: { token: string | null }) => void) =>
      cb({ token: useAppStore.getState().accessToken }),
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  })

  socket.on('connect', () => console.log('[socket] conectado'))
  socket.on('disconnect', (reason) => console.log('[socket] desconectado:', reason))

  // Al reconectar: recargar mesas y órdenes para no perderse cambios mientras estuvo offline
  socket.io.on('reconnect', () => {
    console.log('[socket] reconectado — recargando datos')
    const store = useAppStore.getState()
    Promise.all([
      api.get<{ data: TableDTO[] }>('/tables'),
      api.get<{ data: OrderDTO[] }>('/orders'),
    ])
      .then(([tablesRes, ordersRes]) => {
        store.setTables(tablesRes.data)
        store.setOrders(ordersRes.data)
      })
      .catch((err: unknown) => console.error('[socket] error recargando datos:', err))
  })

  socket.on('event', (event: SocketEvent) => {
    const store = useAppStore.getState()

    switch (event.type) {
      case 'order:new':
        store.upsertOrder(event.order)
        break

      case 'order:status_changed':
        store.updateOrderStatus(event.orderId, event.status)
        // La mesa solo se libera cuando la orden es pagada (evento order:paid)
        // No marcar la mesa como disponible en 'delivered' — el cliente sigue sentado
        break

      case 'order:cancelled':
        store.removeOrder(event.orderId)
        break

      case 'order:updated':
        store.upsertOrder(event.order)
        break

      case 'order:item_cancelled':
        store.removeOrderItem(event.orderId, event.itemId)
        break

      case 'order:paid':
        store.removeOrder(event.orderId)
        store.updateTableStatus(event.tableId, 'available')
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
