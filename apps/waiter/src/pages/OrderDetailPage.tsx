import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { OrderDTO, OrderStatus } from '@tableflow/shared'
import { useAppStore } from '../store/index'
import { api } from '../lib/api'

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Esperando cocina',
  in_progress: 'En preparación',
  ready: '¡Lista para entregar!',
  delivered: 'Entregada',
  paid: 'Pagada',
  cancelled: 'Cancelada',
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
  ready: 'bg-green-100 text-green-800 border-green-400',
  delivered: 'bg-gray-100 text-gray-600 border-gray-300',
  paid: 'bg-gray-100 text-gray-600 border-gray-300',
  cancelled: 'bg-red-100 text-red-700 border-red-300',
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()

  const orders = useAppStore((s) => s.orders)
  const tables = useAppStore((s) => s.tables)
  const updateOrderStatus = useAppStore((s) => s.updateOrderStatus)
  const upsertOrder = useAppStore((s) => s.upsertOrder)
  const removeOrderItem = useAppStore((s) => s.removeOrderItem)

  const [actionLoading, setActionLoading] = useState(false)
  const [cancellingItemId, setCancellingItemId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const order: OrderDTO | undefined = orders.find((o) => o.id === orderId)
  const table = tables.find((t) => t.id === order?.tableId)

  useEffect(() => {
    if (!orderId) return
    if (orders.length > 0 && !order) {
      navigate('/tables', { replace: true })
    }
  }, [orderId, order, orders.length, navigate])

  async function handleStatusChange(status: OrderStatus) {
    if (!orderId) return
    setActionLoading(true)
    setError('')
    try {
      await api.patch(`/orders/${orderId}/status`, { status })
      updateOrderStatus(orderId, status)
      // 'delivered' solo cambia el status visual — el mesero se queda en la orden
      // para poder cerrar la cuenta después. La mesa no se libera hasta 'paid'.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la orden')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancelItem(itemId: string, itemName: string) {
    if (!orderId) return
    if (!confirm(`¿Cancelar "${itemName}"?`)) return

    setCancellingItemId(itemId)
    setError('')
    try {
      const res = await api.patch<{ data: OrderDTO }>(`/orders/${orderId}/items`, {
        cancelItemId: itemId,
      })
      upsertOrder(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar el item')
    } finally {
      setCancellingItemId(null)
    }
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Cargando orden...
      </div>
    )
  }

  const isTerminal = ['paid', 'cancelled'].includes(order.status)
  const canModifyItems = ['pending', 'in_progress'].includes(order.status)
  const canCheckout = !['paid', 'cancelled'].includes(order.status)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-green-600 text-white px-4 pt-10 pb-4 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/tables')} className="text-2xl active:opacity-70">
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">
              Mesa {order.tableNumber}
              {table?.name ? ` — ${table.name}` : ''}
            </h1>
            <p className="text-green-100 text-sm">{order.waiterName}</p>
          </div>
          {canModifyItems && (
            <button
              onClick={() => navigate(`/orders/${orderId}/add`)}
              className="bg-white/20 text-white text-sm font-semibold rounded-xl px-3 py-2 active:bg-white/30"
            >
              ➕ Agregar
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-48 p-4 space-y-4">
        {/* Status badge */}
        <div
          className={`border rounded-2xl px-4 py-3 text-center font-semibold text-lg ${
            STATUS_STYLE[order.status]
          }`}
        >
          {STATUS_LABEL[order.status]}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">Platillos</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {order.items.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-gray-900">
                      {item.quantity}× {item.menuItemName}
                    </p>
                    <p className="font-semibold text-gray-700 ml-3">
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  {item.notes && (
                    <p className="text-sm text-gray-500 mt-0.5">📝 {item.notes}</p>
                  )}
                </div>
                {canModifyItems && (
                  <button
                    onClick={() => void handleCancelItem(item.id, item.menuItemName)}
                    disabled={cancellingItemId === item.id}
                    className="ml-1 text-red-400 text-xs font-medium px-2 py-1 rounded-lg hover:bg-red-50 active:bg-red-100 disabled:opacity-40 flex-shrink-0"
                  >
                    {cancellingItemId === item.id ? '…' : '✕'}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-between font-bold text-lg">
            <span>Subtotal</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Notas */}
        {order.notes && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3">
            <p className="text-sm font-medium text-yellow-800">Nota:</p>
            <p className="text-yellow-900 mt-1">{order.notes}</p>
          </div>
        )}

        {/* Timestamps */}
        <div className="text-xs text-gray-400 space-y-1 px-1">
          <p>Creada: {new Date(order.createdAt).toLocaleTimeString('es-MX')}</p>
          {order.readyAt && (
            <p>Lista a las: {new Date(order.readyAt).toLocaleTimeString('es-MX')}</p>
          )}
        </div>
      </main>

      {/* Acciones */}
      {!isTerminal && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-bottom space-y-2">
          {order.status === 'ready' && (
            <button
              onClick={() => void handleStatusChange('delivered')}
              disabled={actionLoading}
              className="w-full bg-green-600 text-white font-bold rounded-2xl py-4 text-xl active:bg-green-700 disabled:opacity-60"
            >
              {actionLoading ? 'Procesando...' : '✓ Marcar como entregada'}
            </button>
          )}

          {canCheckout && (
            <button
              onClick={() => navigate(`/orders/${orderId}/checkout`)}
              className="w-full bg-indigo-600 text-white font-bold rounded-2xl py-4 text-lg active:bg-indigo-700"
            >
              💳 Cerrar cuenta — ${order.total.toFixed(2)}
            </button>
          )}

          {order.status !== 'ready' && order.status !== 'delivered' && (
            <p className="text-center text-sm text-gray-400">{STATUS_LABEL[order.status]}</p>
          )}

          <button
            onClick={() => void handleStatusChange('cancelled')}
            disabled={actionLoading}
            className="w-full bg-red-50 text-red-600 font-semibold rounded-2xl py-3 border border-red-200 active:bg-red-100 disabled:opacity-60 text-sm"
          >
            Cancelar orden completa
          </button>
        </div>
      )}
    </div>
  )
}
