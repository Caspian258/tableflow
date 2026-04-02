import { useEffect, useCallback } from 'react'
import { useAdminStore } from '../store/index'
import { api } from '../lib/api'
import type {
  SalesSummary,
  SalesByDay,
  TopItem,
  PeakHour,
  PrepTimesData,
} from '../store/index'
import StatCard from '../components/StatCard'
import SalesChart from '../components/SalesChart'
import PeakHoursChart from '../components/PeakHoursChart'
import TopItemsTable from '../components/TopItemsTable'

function formatCurrency(value: number) {
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`
}

export default function DashboardPage() {
  const {
    user,
    from,
    to,
    setDateRange,
    summary,
    byDay,
    topItems,
    peakHours,
    prepTimes,
    loading,
    error,
    setSales,
    setTopItems,
    setPeakHours,
    setPrepTimes,
    setLoading,
    setError,
    logout,
  } = useAdminStore()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = `?from=${from}&to=${to}`
    try {
      const [salesRes, topRes, peakRes, prepRes] = await Promise.all([
        api.get<{ data: { summary: SalesSummary; byDay: SalesByDay[] } }>(`/analytics/sales${params}`),
        api.get<{ data: TopItem[] }>(`/analytics/top-items${params}`),
        api.get<{ data: PeakHour[] }>(`/analytics/peak-hours${params}`),
        api.get<{ data: PrepTimesData }>(`/analytics/prep-times${params}`),
      ])
      setSales(salesRes.data.summary, salesRes.data.byDay)
      setTopItems(topRes.data)
      setPeakHours(peakRes.data)
      setPrepTimes(prepRes.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [from, to, setLoading, setError, setSales, setTopItems, setPeakHours, setPrepTimes])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <h1 className="text-lg font-bold text-gray-900">TableFlow Admin</h1>
            <p className="text-xs text-gray-400">{user?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Date range picker */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <span className="text-sm text-gray-500">Del</span>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setDateRange(e.target.value, to)}
              className="text-sm text-gray-700 bg-transparent outline-none"
            />
            <span className="text-sm text-gray-500">al</span>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setDateRange(from, e.target.value)}
              className="text-sm text-gray-700 bg-transparent outline-none"
            />
          </div>
          <button
            onClick={() => void fetchAll()}
            disabled={loading}
            className="bg-indigo-600 text-white text-sm font-medium rounded-xl px-4 py-2 hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Ingresos totales"
            value={summary ? formatCurrency(summary.totalRevenue) : '—'}
            sub={`${from} → ${to}`}
            icon="💰"
            color="bg-indigo-50 text-indigo-600"
          />
          <StatCard
            title="Órdenes"
            value={summary ? summary.totalOrders.toString() : '—'}
            sub="en el período"
            icon="🧾"
            color="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            title="Ticket promedio"
            value={summary ? formatCurrency(summary.avgTicket) : '—'}
            sub="por orden"
            icon="📈"
            color="bg-amber-50 text-amber-600"
          />
          <StatCard
            title="Tiempo prep. prom."
            value={prepTimes ? `${prepTimes.averageMinutes} min` : '—'}
            sub={prepTimes ? `p90: ${prepTimes.p90Minutes} min` : undefined}
            icon="⏱️"
            color="bg-rose-50 text-rose-600"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SalesChart data={byDay} />
          <PeakHoursChart data={peakHours} />
        </div>

        {/* Top items */}
        <div className="max-w-2xl">
          <TopItemsTable items={topItems} />
        </div>
      </main>
    </div>
  )
}
