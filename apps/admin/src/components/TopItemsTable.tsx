import type { TopItem } from '../store/index'

interface Props {
  items: TopItem[]
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`
}

const medals = ['🥇', '🥈', '🥉']

export default function TopItemsTable({ items }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Platillos más vendidos</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Sin datos en el período</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
              <th className="pb-2 w-8">#</th>
              <th className="pb-2">Platillo</th>
              <th className="pb-2 text-right">Vendidos</th>
              <th className="pb-2 text-right">Ingresos</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.menuItemId} className="border-b border-gray-50 last:border-0">
                <td className="py-2.5 text-base leading-none">
                  {medals[item.rank - 1] ?? <span className="text-gray-400">{item.rank}</span>}
                </td>
                <td className="py-2.5 font-medium text-gray-800">{item.name}</td>
                <td className="py-2.5 text-right text-gray-600">{item.quantity}</td>
                <td className="py-2.5 text-right text-gray-800 font-medium">
                  {formatCurrency(item.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
