import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TableDTO, OrderDTO } from '@tableflow/shared'
import { useAppStore } from '../store/index'
import { api } from '../lib/api'
import { disconnectSocket } from '../lib/socket'
import TableCard from '../components/TableCard'

export default function TablesPage() {
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const tables = useAppStore((s) => s.tables)
  const orders = useAppStore((s) => s.orders)
  const setTables = useAppStore((s) => s.setTables)
  const setOrders = useAppStore((s) => s.setOrders)
  const logout = useAppStore((s) => s.logout)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [tablesRes, ordersRes] = await Promise.all([
          api.get<{ data: TableDTO[] }>('/tables'),
          api.get<{ data: OrderDTO[] }>('/orders'),
        ])
        setTables(tablesRes.data)
        setOrders(ordersRes.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [setTables, setOrders])

  function handleLogout() {
    disconnectSocket()
    logout()
    api.post('/auth/logout', {}).catch(() => {})
    navigate('/login')
  }

  function handleTablePress(table: TableDTO) {
    if (table.status === 'available') {
      navigate(`/orders/new/${table.id}`)
      return
    }
    if (table.status === 'occupied' || table.status === 'reserved') {
      // Incluir 'delivered': la orden sigue abierta hasta que se cobra
      const activeOrder = orders.find(
        (o) =>
          o.tableId === table.id &&
          !['paid', 'cancelled'].includes(o.status),
      )
      if (activeOrder) {
        navigate(`/orders/${activeOrder.id}`)
      }
    }
  }

  // Mapa: tableId → orden activa (incluye 'delivered' — aún no cobrada)
  const orderByTable = orders.reduce<Record<string, OrderDTO>>((acc, o) => {
    if (!['paid', 'cancelled'].includes(o.status)) {
      acc[o.tableId] = o
    }
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-green-600 text-white px-4 pt-10 pb-4 flex items-center justify-between shadow">
        <div>
          <h1 className="text-2xl font-bold">Mesas</h1>
          <p className="text-green-100 text-sm">{user?.name}</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-white/20 rounded-xl px-4 py-2 text-sm font-medium active:bg-white/30"
        >
          Salir
        </button>
      </header>

      {/* Contenido */}
      <main className="flex-1 p-4">
        {loading && (
          <div className="flex items-center justify-center h-48">
            <div className="text-gray-400 text-lg">Cargando mesas...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4">
            {error}
          </div>
        )}

        {!loading && (
          <>
            {/* Leyenda */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { color: 'bg-green-500', label: 'Disponible' },
                { color: 'bg-red-500', label: 'Ocupada' },
                { color: 'bg-amber-400', label: 'Reservada' },
                { color: 'bg-gray-400', label: 'Limpieza' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  {label}
                </div>
              ))}
            </div>

            {/* Grid de mesas */}
            <div className="grid grid-cols-2 gap-3">
              {tables.map((table) => (
                <TableCard
                  key={table.id}
                  table={table}
                  hasActiveOrder={!!orderByTable[table.id]}
                  orderStatus={orderByTable[table.id]?.status}
                  onClick={() => handleTablePress(table)}
                />
              ))}
            </div>

            {tables.length === 0 && (
              <p className="text-center text-gray-400 mt-8">No hay mesas configuradas</p>
            )}
          </>
        )}
      </main>
    </div>
  )
}
