import { create } from 'zustand'
import type { AuthUser, OrderDTO, OrderStatus } from '@tableflow/shared'

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

  // Orders (solo pending e in_progress llegan aquí)
  orders: OrderDTO[]
  setOrders: (orders: OrderDTO[]) => void
  upsertOrder: (order: OrderDTO) => void
  updateOrderStatus: (orderId: string, status: OrderStatus) => void
  removeOrder: (orderId: string) => void
}

export const useKitchenStore = create<KitchenStore>((set) => ({
  user: null,
  accessToken: null,
  kitchenAlertSeconds: 600,
  restaurantSlug: typeof window !== 'undefined'
    ? localStorage.getItem('restaurantSlug')
    : null,

  setAuth: (user, accessToken, kitchenAlertSeconds) =>
    set({ user, accessToken, kitchenAlertSeconds }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setRestaurantSlug: (slug) => {
    localStorage.setItem('restaurantSlug', slug)
    set({ restaurantSlug: slug })
  },
  logout: () => set({ user: null, accessToken: null, orders: [] }),

  orders: [],
  setOrders: (orders) => set({ orders }),
  upsertOrder: (order) =>
    set((s) => {
      const exists = s.orders.some((o) => o.id === order.id)
      return {
        orders: exists
          ? s.orders.map((o) => (o.id === order.id ? order : o))
          : [order, ...s.orders],
      }
    }),
  updateOrderStatus: (orderId, status) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
    })),
  removeOrder: (orderId) =>
    set((s) => ({ orders: s.orders.filter((o) => o.id !== orderId) })),
}))
