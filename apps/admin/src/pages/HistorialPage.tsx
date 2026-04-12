import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../store/index'
import { api } from '../lib/api'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PaidOrderItem {
  name: string
  quantity: number
  unitPrice: number
  notes?: string
}

interface PaidOrder {
  id: string
  paymentId: string
  tableNumber: number
  waiterName: string
  itemCount: number
  items: PaidOrderItem[]
  subtotal: number
  tip: number
  total: number
  method: 'cash' | 'card' | 'transfer'
  paidAt: string
}

interface Meta {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const METHOD_LABEL: Record<string, string> = {
  cash: '💵 Efectivo',
  card: '💳 Tarjeta',
  transfer: '📲 Transferencia',
}

function formatCurrency(n: number) {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

// ─── Presets de fecha ─────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Hoy',         from: () => today(),      to: () => today() },
  { label: 'Últimos 7 días', from: () => daysAgo(6), to: () => today() },
  { label: 'Últimos 30 días', from: () => daysAgo(29), to: () => today() },
]

// ─── Modal de detalle ─────────────────────────────────────────────────────────

function TicketModal({ order, onClose }: { order: PaidOrder; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Mesa {order.tableNumber}
            </h2>
            <p className="text-sm text-gray-500">{formatDateTime(order.paidAt)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Info */}
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-gray-500">Mesero</span>
              <p className="font-medium text-gray-900">{order.waiterName}</p>
            </div>
            <div>
              <span className="text-gray-500">Método</span>
              <p className="font-medium text-gray-900">{METHOD_LABEL[order.method]}</p>
            </div>
          </div>

          {/* Items */}
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Platillos
            </div>
            <div className="divide-y divide-gray-50">
              {order.items.map((item, i) => (
                <div key={i} className="px-4 py-2.5 flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {item.quantity}× {item.name}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-gray-400 mt-0.5">📝 {item.notes}</p>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-700 shrink-0">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.tip > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Propina</span>
                <span>{formatCurrency(order.tip)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100 mt-1">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function HistorialPage() {
  const navigate = useNavigate()
  const user = useAdminStore((s) => s.user)

  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(today())
  const [page, setPage] = useState(1)

  const [orders, setOrders] = useState<PaidOrder[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<PaidOrder | null>(null)

  const fetchHistory = useCallback(async (p = 1) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get<{ data: PaidOrder[]; meta: Meta }>(
        `/orders/history?from=${from}&to=${to}&page=${p}&limit=20`,
      )
      setOrders(res.data)
      setMeta(res.meta)
      setPage(p)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar historial')
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    void fetchHistory(1)
  }, [fetchHistory])

  function applyPreset(presetFrom: string, presetTo: string) {
    setFrom(presetFrom)
    setTo(presetTo)
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Historial de tickets</h1>
            <p className="text-xs text-gray-400">{user?.name}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Dashboard
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 flex flex-wrap items-center gap-3">
          {/* Presets */}
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.from(), p.to())}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  from === p.from() && to === p.to()
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Separador */}
          <div className="h-5 w-px bg-gray-200" />

          {/* Rango personalizado */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Del</span>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <span className="text-sm text-gray-500">al</span>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <button
            onClick={() => void fetchHistory(1)}
            disabled={loading}
            className="ml-auto bg-indigo-600 text-white text-sm font-medium rounded-xl px-4 py-2 hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Cargando…' : 'Buscar'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Tabla */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Resumen */}
          {meta && (
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {meta.total === 0
                  ? 'Sin resultados en este período'
                  : `${meta.total} ticket${meta.total !== 1 ? 's' : ''} — página ${meta.page} de ${meta.totalPages}`}
              </p>
              {meta.total > 0 && (
                <p className="text-sm font-semibold text-gray-700">
                  Total período:{' '}
                  {formatCurrency(orders.reduce((s, o) => s + o.total, 0))}
                  {meta.totalPages > 1 && (
                    <span className="font-normal text-gray-400"> (esta página)</span>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Encabezados */}
          <div className="grid grid-cols-6 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span className="col-span-2">Fecha y hora</span>
            <span>Mesa</span>
            <span>Mesero</span>
            <span className="text-right">Total</span>
            <span>Método</span>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              Cargando…
            </div>
          )}

          {!loading && orders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <span className="text-3xl">🧾</span>
              <p className="text-sm">No hay tickets en este período</p>
            </div>
          )}

          {!loading && orders.map((order) => (
            <button
              key={order.id}
              onClick={() => setSelected(order)}
              className="w-full grid grid-cols-6 gap-4 px-5 py-3.5 border-b border-gray-50 hover:bg-indigo-50 transition-colors text-left last:border-b-0"
            >
              <span className="col-span-2 text-sm text-gray-700">
                {formatDateTime(order.paidAt)}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                Mesa {order.tableNumber}
              </span>
              <span className="text-sm text-gray-600 truncate">{order.waiterName}</span>
              <span className="text-sm font-bold text-gray-900 text-right">
                {formatCurrency(order.total)}
              </span>
              <span className="text-sm text-gray-500">{METHOD_LABEL[order.method]}</span>
            </button>
          ))}
        </div>

        {/* Paginación */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => void fetchHistory(page - 1)}
              disabled={page <= 1 || loading}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-indigo-300 disabled:opacity-40 transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-sm text-gray-500 px-2">
              {page} / {meta.totalPages}
            </span>
            <button
              onClick={() => void fetchHistory(page + 1)}
              disabled={page >= meta.totalPages || loading}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-indigo-300 disabled:opacity-40 transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}
      </main>

      {/* Modal de detalle */}
      {selected && <TicketModal order={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
