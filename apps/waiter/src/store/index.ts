import { create } from 'zustand'
import type {
  AuthUser,
  TableDTO,
  TableStatus,
  MenuCategoryDTO,
  OrderDTO,
  OrderStatus,
} from '@tableflow/shared'

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  notes: string
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface AppStore {
  // Auth
  user: AuthUser | null
  accessToken: string | null
  setAuth: (user: AuthUser, token: string) => void
  setAccessToken: (token: string) => void
  logout: () => void

  // Tables
  tables: TableDTO[]
  setTables: (tables: TableDTO[]) => void
  updateTableStatus: (tableId: string, status: TableStatus) => void

  // Menu (caché)
  menu: MenuCategoryDTO[] | null
  setMenu: (menu: MenuCategoryDTO[]) => void

  // Active orders (no paid/cancelled)
  orders: OrderDTO[]
  setOrders: (orders: OrderDTO[]) => void
  upsertOrder: (order: OrderDTO) => void
  updateOrderStatus: (orderId: string, status: OrderStatus) => void
  removeOrderItem: (orderId: string, itemId: string) => void
  removeOrder: (orderId: string) => void

  // Cart (borrador de nueva orden)
  cartTableId: string | null
  cart: CartItem[]
  cartNotes: string
  setCartTable: (tableId: string) => void
  addToCart: (item: Omit<CartItem, 'quantity' | 'notes'>) => void
  incrementCart: (menuItemId: string) => void
  decrementCart: (menuItemId: string) => void
  updateCartItemNotes: (menuItemId: string, notes: string) => void
  setCartNotes: (notes: string) => void
  clearCart: () => void
}

export const useAppStore = create<AppStore>((set) => ({
  // Auth
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  logout: () =>
    set({ user: null, accessToken: null, tables: [], orders: [], menu: null, cart: [], cartTableId: null }),

  // Tables
  tables: [],
  setTables: (tables) => set({ tables }),
  updateTableStatus: (tableId, status) =>
    set((s) => ({
      tables: s.tables.map((t) => (t.id === tableId ? { ...t, status } : t)),
    })),

  // Menu
  menu: null,
  setMenu: (menu) => set({ menu }),

  // Orders
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
  removeOrderItem: (orderId, itemId) =>
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === orderId
          ? { ...o, items: o.items.filter((i) => i.id !== itemId) }
          : o,
      ),
    })),
  removeOrder: (orderId) =>
    set((s) => ({ orders: s.orders.filter((o) => o.id !== orderId) })),

  // Cart
  cartTableId: null,
  cart: [],
  cartNotes: '',
  setCartTable: (cartTableId) => set({ cartTableId, cart: [], cartNotes: '' }),
  addToCart: (item) =>
    set((s) => {
      const existing = s.cart.find((c) => c.menuItemId === item.menuItemId)
      if (existing) {
        return {
          cart: s.cart.map((c) =>
            c.menuItemId === item.menuItemId ? { ...c, quantity: c.quantity + 1 } : c,
          ),
        }
      }
      return { cart: [...s.cart, { ...item, quantity: 1, notes: '' }] }
    }),
  incrementCart: (menuItemId) =>
    set((s) => ({
      cart: s.cart.map((c) =>
        c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + 1 } : c,
      ),
    })),
  decrementCart: (menuItemId) =>
    set((s) => ({
      cart: s.cart
        .map((c) =>
          c.menuItemId === menuItemId ? { ...c, quantity: c.quantity - 1 } : c,
        )
        .filter((c) => c.quantity > 0),
    })),
  updateCartItemNotes: (menuItemId, notes) =>
    set((s) => ({
      cart: s.cart.map((c) => (c.menuItemId === menuItemId ? { ...c, notes } : c)),
    })),
  setCartNotes: (cartNotes) => set({ cartNotes }),
  clearCart: () => set({ cart: [], cartTableId: null, cartNotes: '' }),
}))
