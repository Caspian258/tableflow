import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../store/index'
import { api } from '../lib/api'

type PaymentMethod = 'cash' | 'card' | 'transfer'

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: '💵 Efectivo',
  card: '💳 Tarjeta',
  transfer: '📲 Transferencia',
}

const TIP_PRESETS = [0, 10, 15, 20]

interface PaymentResult {
  orderId: string
  total: number
  subtotal: number
  tip: number
  method: PaymentMethod
}

export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()

  const orders = useAppStore((s) => s.orders)
  const tables = useAppStore((s) => s.tables)
  const removeOrder = useAppStore((s) => s.removeOrder)
  const updateTableStatus = useAppStore((s) => s.updateTableStatus)

  const order = orders.find((o) => o.id === orderId)
  const table = tables.find((t) => t.id === order?.tableId)

  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [tipPreset, setTipPreset] = useState<number | 'custom'>(0)
  const [customTip, setCustomTip] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<PaymentResult | null>(null)

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Orden no encontrada
      </div>
    )
  }

  const subtotal = order.total
  const tipAmount =
    tipPreset === 'custom'
      ? parseFloat(customTip) || 0
      : (subtotal * tipPreset) / 100
  const total = subtotal + tipAmount

  async function handleConfirm() {
    if (!orderId) return
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post<{ data: PaymentResult }>(`/orders/${orderId}/payment`, {
        method,
        tip: tipAmount,
      })
      // Actualizar store
      removeOrder(orderId)
      if (order) updateTableStatus(order.tableId, 'available')
      setResult(res.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar el pago')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Ticket post-pago ────────────────────────────────────────────────────
  if (result) {
    return (
      <TicketView
        order={order}
        table={table}
        result={result}
        onNewOrder={() => navigate('/tables')}
      />
    )
  }

  // ─── Pantalla de cobro ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-indigo-600 text-white px-4 pt-10 pb-4 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/orders/${orderId}`)} className="text-2xl active:opacity-70">
            ←
          </button>
          <div>
            <h1 className="text-xl font-bold">
              Cerrar cuenta — Mesa {order.tableNumber}
              {table?.name ? ` — ${table.name}` : ''}
            </h1>
            <p className="text-indigo-100 text-sm">{order.waiterName}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-48 p-4 space-y-4">
        {/* Resumen de items */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">Resumen</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {order.items.map((item) => (
              <div key={item.id} className="px-4 py-2.5 flex justify-between items-center">
                <span className="text-gray-700">
                  {item.quantity}× {item.menuItemName}
                </span>
                <span className="font-medium text-gray-900">
                  ${(item.unitPrice * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-between font-semibold text-base">
            <span className="text-gray-600">Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Propina */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <h2 className="font-semibold text-gray-700">Propina</h2>
          <div className="grid grid-cols-4 gap-2">
            {TIP_PRESETS.map((pct) => (
              <button
                key={pct}
                onClick={() => setTipPreset(pct)}
                className={`py-3 rounded-xl text-base font-bold border transition-colors ${
                  tipPreset === pct
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-200 active:bg-gray-50'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
          <button
            onClick={() => setTipPreset('custom')}
            className={`w-full py-3 rounded-xl text-sm font-semibold border transition-colors ${
              tipPreset === 'custom'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'
            }`}
          >
            Monto personalizado
          </button>
          {tipPreset === 'custom' && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={customTip}
                onChange={(e) => setCustomTip(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-3 text-base outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          )}
          {tipAmount > 0 && (
            <p className="text-sm text-gray-500 text-center">
              Propina: <strong>${tipAmount.toFixed(2)}</strong>
            </p>
          )}
        </div>

        {/* Método de pago */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <h2 className="font-semibold text-gray-700">Método de pago</h2>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`py-4 rounded-xl text-sm font-semibold border flex flex-col items-center gap-1 transition-colors ${
                  method === m
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-200 active:bg-gray-50'
                }`}
              >
                <span className="text-2xl">{METHOD_LABEL[m].split(' ')[0]}</span>
                <span>{METHOD_LABEL[m].split(' ')[1]}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}
      </main>

      {/* Total + confirmar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-bottom space-y-3">
        <div className="flex justify-between items-center px-1">
          <span className="text-gray-500 text-sm">Total a cobrar</span>
          <span className="text-3xl font-black text-indigo-700">${total.toFixed(2)}</span>
        </div>
        <button
          onClick={() => void handleConfirm()}
          disabled={submitting}
          className="w-full bg-indigo-600 text-white font-bold rounded-2xl py-5 text-xl active:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? 'Procesando...' : `Confirmar pago · ${METHOD_LABEL[method].split(' ')[1]}`}
        </button>
      </div>
    </div>
  )
}

// ─── Componente de ticket ──────────────────────────────────────────────────────

interface TicketViewProps {
  order: ReturnType<typeof useAppStore.getState>['orders'][0]
  table: ReturnType<typeof useAppStore.getState>['tables'][0] | undefined
  result: {
    subtotal: number
    tip: number
    total: number
    method: PaymentMethod
  }
  onNewOrder: () => void
}

function TicketView({ order, table, result, onNewOrder }: TicketViewProps) {
  const paidAt = new Date()

  return (
    <>
      {/* Estilos de impresión */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .ticket-container { box-shadow: none; border: none; margin: 0; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start p-4 no-print-bg">
        {/* Ticket */}
        <div className="ticket-container w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 my-4 space-y-4">
          {/* Encabezado */}
          <div className="text-center space-y-1 border-b border-dashed border-gray-200 pb-4">
            <p className="text-lg font-bold text-gray-900">TableFlow</p>
            <p className="text-sm text-gray-500">
              Mesa {order.tableNumber}
              {table?.name ? ` — ${table.name}` : ''}
            </p>
            <p className="text-xs text-gray-400">
              {paidAt.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
              {' — '}
              {paidAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Items */}
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.quantity}× {item.menuItemName}
                </span>
                <span className="font-medium text-gray-900">
                  ${(item.unitPrice * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Totales */}
          <div className="border-t border-dashed border-gray-200 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>${result.subtotal.toFixed(2)}</span>
            </div>
            {result.tip > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Propina</span>
                <span>${result.tip.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black text-gray-900 pt-1 border-t border-gray-200">
              <span>Total</span>
              <span>${result.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Método */}
          <div className="text-center">
            <span className="text-sm text-gray-500 bg-gray-100 rounded-full px-3 py-1">
              Pago con {result.method === 'cash' ? 'Efectivo' : result.method === 'card' ? 'Tarjeta' : 'Transferencia'}
            </span>
          </div>

          <p className="text-center text-xs text-gray-400 pt-2">¡Gracias por su visita!</p>
        </div>

        {/* Botones */}
        <div className="w-full max-w-sm space-y-2 no-print">
          <button
            onClick={() => window.print()}
            className="w-full bg-gray-700 text-white font-semibold rounded-2xl py-4 text-base active:bg-gray-800"
          >
            🖨️ Imprimir ticket
          </button>
          <button
            onClick={onNewOrder}
            className="w-full bg-green-600 text-white font-bold rounded-2xl py-4 text-lg active:bg-green-700"
          >
            ✓ Nueva orden
          </button>
        </div>
      </div>
    </>
  )
}
