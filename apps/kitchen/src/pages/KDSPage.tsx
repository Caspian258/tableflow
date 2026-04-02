import { useEffect, useState } from 'react'
import type { OrderDTO, OrderStatus } from '@tableflow/shared'
import { useKitchenStore } from '../store/index'
import { api } from '../lib/api'
import { disconnectSocket } from '../lib/socket'
import OrderCard from '../components/OrderCard'

interface Props {
  onLogout: () => void
}

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="text-slate-300 text-lg font-mono tabular-nums">
      {time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

export default function KDSPage({ onLogout }: Props) {
  const user = useKitchenStore((s) => s.user)
  const orders = useKitchenStore((s) => s.orders)
  const kitchenAlertSeconds = useKitchenStore((s) => s.kitchenAlertSeconds)
  const setOrders = useKitchenStore((s) => s.setOrders)
  const updateOrderStatus = useKitchenStore((s) => s.updateOrderStatus)
  const logout = useKitchenStore((s) => s.logout)

  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Cargar órdenes activas al montar
  useEffect(() => {
    api
      .get<{ data: OrderDTO[] }>('/orders')
      .then((res) => {
        const active = res.data.filter(
          (o) => o.status === 'pending' || o.status === 'in_progress',
        )
        setOrders(active)
      })
      .catch((err) => setError(err.message))
  }, [setOrders])

  async function handleAction(orderId: string, newStatus: OrderStatus) {
    setLoadingOrderId(orderId)
    setError('')
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus })
      updateOrderStatus(orderId, newStatus)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la orden')
    } finally {
      setLoadingOrderId(null)
    }
  }

  function handleLogout() {
    disconnectSocket()
    logout()
    onLogout()
  }

  const pending = orders.filter((o) => o.status === 'pending')
  const inProgress = orders.filter((o) => o.status === 'in_progress')

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-slate-800 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👨‍🍳</span>
          <div>
            <h1 className="text-lg font-bold leading-tight">TableFlow KDS</h1>
            <p className="text-slate-400 text-xs">{user?.name}</p>
          </div>
        </div>

        <Clock />

        <button
          onClick={handleLogout}
          className="text-slate-400 text-sm bg-slate-700 px-4 py-2 rounded-lg active:bg-slate-600"
        >
          Salir
        </button>
      </header>

      {error && (
        <div className="bg-red-900/50 border-b border-red-700 text-red-300 text-sm px-6 py-2">
          {error}
        </div>
      )}

      {/* Columnas */}
      <div className="flex flex-1 overflow-hidden divide-x divide-slate-700">

        {/* Columna Pendientes */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2 bg-yellow-900/30 border-b border-yellow-700/40 shrink-0">
            <h2 className="text-yellow-400 font-bold text-sm uppercase tracking-wider">
              ⏳ Pendientes
              <span className="ml-2 bg-yellow-500 text-slate-900 text-xs font-black rounded-full px-2 py-0.5">
                {pending.length}
              </span>
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {pending.length === 0 && (
              <div className="flex items-center justify-center h-32 text-slate-600">
                Sin órdenes pendientes
              </div>
            )}
            {pending.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                kitchenAlertSeconds={kitchenAlertSeconds}
                onAction={handleAction}
                loading={loadingOrderId === order.id}
              />
            ))}
          </div>
        </div>

        {/* Columna En preparación */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2 bg-blue-900/30 border-b border-blue-700/40 shrink-0">
            <h2 className="text-blue-400 font-bold text-sm uppercase tracking-wider">
              🔥 En preparación
              <span className="ml-2 bg-blue-500 text-white text-xs font-black rounded-full px-2 py-0.5">
                {inProgress.length}
              </span>
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {inProgress.length === 0 && (
              <div className="flex items-center justify-center h-32 text-slate-600">
                Sin órdenes en preparación
              </div>
            )}
            {inProgress.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                kitchenAlertSeconds={kitchenAlertSeconds}
                onAction={handleAction}
                loading={loadingOrderId === order.id}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
