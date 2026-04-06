import { create } from 'zustand'
import type { AuthUser, OrderDTO, OrderStatus } from '@tableflow/shared'

// Metadatos de UI por orden (no forman parte del DTO)
interface OrderMeta {
  newItemIds: Set<string>   // IDs de items recién agregados (highlight 10s)
  cancelledItemIds: Set<string>  // IDs de items cancelados (tachado)
}

interface KitchenStore {
  // Auth
  user: AuthUser | null
  accessToken: string | null
  kitchenAlertSeconds: number
  restaurantSlug: string | null

  setAuth: (user: AuthUser, token: string, alertSecs: number) => void
  setAccessToken: (token: string) => void
  setRestaurantSlug: (slug: string) => void
  logout: () => void

  // Orders
  orders: OrderDTO[]
  orderMeta: Record<string, OrderMeta>

  setOrders: (orders: OrderDTO[]) => void
  upsertOrder: (order: OrderDTO) => void
  upsertOrderWithNewItems: (order: OrderDTO) => void
  updateOrderStatus: (orderId: string, status: OrderStatus) => void
  removeOrder: (orderId: string) => void
  markItemCancelled: (orderId: string, itemId: string) => void
  clearNewItems: (orderId: string) => void
}

export const useKitchenStore = create<KitchenStore>((set, get) => ({
  user: null,
  accessToken: null,
  kitchenAlertSeconds: 600,
  restaurantSlug:
    typeof window !== 'undefined' ? localStorage.getItem('restaurantSlug') : null,

  setAuth: (user, accessToken, kitchenAlertSeconds) =>
    set({ user, accessToken, kitchenAlertSeconds }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setRestaurantSlug: (slug) => {
    localStorage.setItem('restaurantSlug', slug)
    set({ restaurantSlug: slug })
  },
  logout: () => set({ user: null, accessToken: null, orders: [], orderMeta: {} }),

  orders: [],
  orderMeta: {},

  setOrders: (orders) => set({ orders, orderMeta: {} }),

  upsertOrder: (order) =>
    set((s) => {
      const exists = s.orders.some((o) => o.id === order.id)
      return {
        orders: exists
          ? s.orders.map((o) => (o.id === order.id ? order : o))
          : [order, ...s.orders],
      }
    }),

  upsertOrderWithNewItems: (incoming) =>
    set((s) => {
      const existing = s.orders.find((o) => o.id === incoming.id)
      if (!existing) {
        // Orden nueva — no hay items "nuevos" que resaltar
        return { orders: [incoming, ...s.orders] }
      }

      // Detectar IDs de items que no estaban antes
      const existingItemIds = new Set(existing.items.map((i) => i.id))
      const newIds = new Set(incoming.items.filter((i) => !existingItemIds.has(i.id)).map((i) => i.id))

      const prevMeta = s.orderMeta[incoming.id] ?? { newItemIds: new Set(), cancelledItemIds: new Set() }
      const updatedMeta: OrderMeta = {
        ...prevMeta,
        newItemIds: new Set([...prevMeta.newItemIds, ...newIds]),
      }

      // Auto-limpiar highlights después de 10s
      if (newIds.size > 0) {
        setTimeout(() => {
          get().clearNewItems(incoming.id)
        }, 10_000)
      }

      return {
        orders: s.orders.map((o) => (o.id === incoming.id ? incoming : o)),
        orderMeta: { ...s.orderMeta, [incoming.id]: updatedMeta },
      }
    }),

  updateOrderStatus: (orderId, status) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
    })),

  removeOrder: (orderId) =>
    set((s) => {
      const { [orderId]: _removed, ...rest } = s.orderMeta
      return { orders: s.orders.filter((o) => o.id !== orderId), orderMeta: rest }
    }),

  markItemCancelled: (orderId, itemId) =>
    set((s) => {
      const prevMeta = s.orderMeta[orderId] ?? { newItemIds: new Set(), cancelledItemIds: new Set() }
      return {
        orderMeta: {
          ...s.orderMeta,
          [orderId]: {
            ...prevMeta,
            cancelledItemIds: new Set([...prevMeta.cancelledItemIds, itemId]),
          },
        },
      }
    }),

  clearNewItems: (orderId) =>
    set((s) => {
      const prevMeta = s.orderMeta[orderId]
      if (!prevMeta) return {}
      return {
        orderMeta: {
          ...s.orderMeta,
          [orderId]: { ...prevMeta, newItemIds: new Set() },
        },
      }
    }),
}))
