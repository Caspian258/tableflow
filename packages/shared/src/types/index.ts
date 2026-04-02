// Tipos compartidos entre frontend y backend

export type UserRole = 'superadmin' | 'owner' | 'manager' | 'waiter' | 'kitchen'

export type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'delivered' | 'paid' | 'cancelled'

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning'

export type PaymentMethod = 'cash' | 'card' | 'transfer'

// ─── Auth ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  restaurantId: string | null
  name: string
  email: string
  role: UserRole
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  user: AuthUser
}

// ─── Orders ────────────────────────────────────────────────────────────────

export interface CreateOrderRequest {
  tableId: string
  items: Array<{
    menuItemId: string
    quantity: number
    notes?: string
  }>
  notes?: string
}

export interface OrderItemDTO {
  id: string
  menuItemId: string
  menuItemName: string
  quantity: number
  unitPrice: number
  notes?: string
}

export interface OrderDTO {
  id: string
  tableId: string
  tableNumber: number
  waiterName: string
  status: OrderStatus
  items: OrderItemDTO[]
  notes?: string
  createdAt: string
  readyAt?: string
  deliveredAt?: string
  total: number
}

// ─── WebSocket Events ──────────────────────────────────────────────────────

export type SocketEvent =
  | { type: 'order:new'; order: OrderDTO }
  | { type: 'order:status_changed'; orderId: string; status: OrderStatus }
  | { type: 'order:cancelled'; orderId: string }
  | { type: 'table:status_changed'; tableId: string; status: TableStatus }
