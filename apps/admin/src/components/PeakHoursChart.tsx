import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { PeakHour } from '../store/index'

interface Props {
  data: PeakHour[]
}

function formatHour(hour: number) {
  if (hour === 0) return '12a'
  if (hour < 12) return `${hour}a`
  if (hour === 12) return '12p'
  return `${hour - 12}p`
}

export default function PeakHoursChart({ data }: Props) {
  const maxOrders = Math.max(...data.map((d) => d.orders), 1)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Horas pico</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="hour"
            tickFormatter={formatHour}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            width={32}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value: number) => [value, 'Órdenes']}
            labelFormatter={(hour: number) => `${hour}:00 – ${hour + 1}:00`}
            contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e5e7eb', fontSize: 13 }}
          />
          <Bar dataKey="orders" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.hour}
                fill={entry.orders >= maxOrders * 0.75 ? '#6366f1' : '#c7d2fe'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
