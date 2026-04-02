interface Props {
  title: string
  value: string
  sub?: string
  icon: string
  color: string
}

export default function StatCard({ title, value, sub, icon, color }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
      <div className={`text-3xl p-3 rounded-xl ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
