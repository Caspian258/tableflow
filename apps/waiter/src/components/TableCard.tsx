import type { TableDTO, TableStatus } from '@tableflow/shared'

const STATUS_CONFIG: Record<
  TableStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  available: {
    label: 'Disponible',
    bg: 'bg-green-500',
    text: 'text-white',
    border: 'border-green-600',
  },
  occupied: {
    label: 'Ocupada',
    bg: 'bg-red-500',
    text: 'text-white',
    border: 'border-red-600',
  },
  reserved: {
    label: 'Reservada',
    bg: 'bg-amber-400',
    text: 'text-white',
    border: 'border-amber-500',
  },
  cleaning: {
    label: 'Limpieza',
    bg: 'bg-gray-400',
    text: 'text-white',
    border: 'border-gray-500',
  },
}

interface Props {
  table: TableDTO
  hasActiveOrder?: boolean
  orderStatus?: string
  onClick: () => void
}

export default function TableCard({ table, hasActiveOrder, orderStatus, onClick }: Props) {
  const cfg = STATUS_CONFIG[table.status]

  return (
    <button
      onClick={onClick}
      className={`
        relative w-full aspect-square rounded-2xl border-2 ${cfg.border}
        ${cfg.bg} ${cfg.text}
        flex flex-col items-center justify-center
        active:scale-95 transition-transform shadow-md
      `}
    >
      <span className="text-3xl font-bold">{table.number}</span>
      {table.name && (
        <span className="text-xs mt-1 opacity-90 font-medium px-2 text-center leading-tight">
          {table.name}
        </span>
      )}
      <span className="text-xs mt-2 bg-black/20 rounded-full px-2 py-0.5">
        {cfg.label}
      </span>
      {hasActiveOrder && orderStatus && (
        <span className="absolute top-2 right-2 bg-white/30 rounded-full px-1.5 py-0.5 text-xs font-semibold">
          {orderStatus === 'ready' ? '✓ Lista' : '⏳'}
        </span>
      )}
    </button>
  )
}
