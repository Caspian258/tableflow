import { useEffect, useState } from 'react'
import type { OrderDTO, OrderStatus } from '@tableflow/shared'

interface Props {
  order: OrderDTO
  kitchenAlertSeconds: number
  onAction: (orderId: string, status: OrderStatus) => void
  loading: boolean
}

function useElapsed(createdAt: string) {
  const [secs, setSecs] = useState(() =>
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000),
  )

  useEffect(() => {
    const id = setInterval(
      () => setSecs(Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)),
      1000,
    )
    return () => clearInterval(id)
  }, [createdAt])

  return secs
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function OrderCard({ order, kitchenAlertSeconds, onAction, loading }: Props) {
  const elapsed = useElapsed(order.createdAt)
  const isLate = elapsed > kitchenAlertSeconds
  const isPending = order.status === 'pending'

  return (
    <div
      className={`
        rounded-2xl border-2 p-4 flex flex-col gap-3
        ${isLate
          ? 'border-red-500 bg-red-950/40 animate-pulse'
          : isPending
          ? 'border-yellow-500/60 bg-slate-800'
          : 'border-blue-500/60 bg-slate-800'}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-white">Mesa {order.tableNumber}</span>
            {isLate && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                ⚠ Tarde
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm">{order.waiterName}</p>
        </div>

        {/* Timer */}
        <div
          className={`text-right text-xl font-mono font-bold tabular-nums ${
            isLate ? 'text-red-400' : 'text-slate-300'
          }`}
        >
          ⏱ {formatTime(elapsed)}
        </div>
      </div>

      {/* Items */}
      <ul className="space-y-1.5">
        {order.items.map((item) => (
          <li key={item.id} className="text-sm">
            <span className="font-bold text-white">
              {item.quantity}× {item.menuItemName}
            </span>
            {item.notes && (
              <span className="text-yellow-300 ml-1">— {item.notes}</span>
            )}
          </li>
        ))}
      </ul>

      {/* Notas generales */}
      {order.notes && (
        <p className="text-yellow-200 text-xs bg-yellow-900/30 rounded-lg px-2 py-1 border border-yellow-700/40">
          📋 {order.notes}
        </p>
      )}

      {/* Acción */}
      <button
        onClick={() =>
          onAction(order.id, isPending ? 'in_progress' : 'ready')
        }
        disabled={loading}
        className={`
          w-full py-3 rounded-xl text-base font-bold uppercase tracking-wide
          transition-all active:scale-95 disabled:opacity-50
          ${isPending
            ? 'bg-yellow-500 text-slate-900 hover:bg-yellow-400'
            : 'bg-green-500 text-white hover:bg-green-400'}
        `}
      >
        {loading
          ? 'Procesando...'
          : isPending
          ? '▶ Iniciar preparación'
          : '✓ Marcar lista'}
      </button>
    </div>
  )
}
